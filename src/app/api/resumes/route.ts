import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { inngest } from "@/server/inngest/client";
import { extractProfileFromText } from "@/server/resumes/text-profile";
import { extractResumeText } from "@/server/resumes/text-extraction";
import { assessResumeExtraction } from "@/server/resumes/resume-quality";
import { createServerSupabaseClient } from "@/server/supabase/server";

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const allowedExtensions = new Set(["pdf", "doc", "docx"]);
const maxSize = 8 * 1024 * 1024;

function hasExpectedSignature(bytes: Buffer, extension: string) {
  if (extension === "pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if (extension === "docx") return bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (extension === "doc") {
    const oleHeader = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    return bytes.subarray(0, oleHeader.length).equals(oleHeader);
  }
  return false;
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "The upload request must use valid multipart form data." }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A resume file is required." }, { status: 400 });
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedExtensions.has(extension) || (file.type && !allowedMimeTypes.has(file.type))) {
    return NextResponse.json({ error: "Upload a PDF, DOC, or DOCX resume." }, { status: 415 });
  }
  if (file.size <= 0 || file.size > maxSize) {
    return NextResponse.json({ error: "Resume files must be between 1 byte and 8 MB." }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!hasExpectedSignature(bytes, extension)) {
    return NextResponse.json(
      { error: "The file contents do not match the selected resume format." },
      { status: 415 },
    );
  }
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    const id = randomUUID();
    const resumeText = await extractResumeText({
      bytes,
      mimeType: file.type || "application/pdf",
      originalName: file.name,
    });
    const extraction = extractProfileFromText(resumeText, file.name);
    const quality = assessResumeExtraction(extraction);
    return NextResponse.json({
      id,
      mode: "demo",
      status: "review_required",
      sha256,
      extraction,
      quality,
    });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in before uploading a resume." }, { status: 401 });

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentUploadCount } = await supabase
    .from("resumes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", oneHourAgo);
  if ((recentUploadCount ?? 0) >= 10) {
    return NextResponse.json(
      { error: "Resume upload limit reached. Try again in about an hour." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  const resumeId = randomUUID();
  const storagePath = `${user.id}/${resumeId}/original.${extension}`;
  const mimeType = file.type || "application/octet-stream";
  const { error: uploadError } = await supabase.storage.from("resumes").upload(storagePath, bytes, {
    contentType: mimeType,
    upsert: false,
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  await supabase.from("resumes").update({ is_active: false }).eq("user_id", user.id).eq("is_active", true);
  const { error: resumeError } = await supabase.from("resumes").insert({
    id: resumeId,
    user_id: user.id,
    storage_path: storagePath,
    original_name: file.name,
    mime_type: mimeType,
    size_bytes: file.size,
    sha256,
    status: "processing",
    is_active: true,
  });
  if (resumeError) {
    await supabase.storage.from("resumes").remove([storagePath]);
    return NextResponse.json({ error: resumeError.message }, { status: 500 });
  }

  await supabase.from("profiles").update({ onboarding_state: "processing" }).eq("id", user.id);

  const resumeText = await extractResumeText({ bytes, mimeType, originalName: file.name });
  const localExtraction = extractProfileFromText(resumeText, file.name);
  const quality = assessResumeExtraction(localExtraction);
  await supabase.from("resume_extractions").insert({
    user_id: user.id,
    resume_id: resumeId,
    parser_version: "local-text-v2",
    raw_data: localExtraction,
    confidence_map: localExtraction.confidence,
  });

  const { upsertProfileFromExtraction } = await import("@/server/profile/repository");
  await upsertProfileFromExtraction(supabase, user.id, localExtraction);

  let status: "processing" | "review_required" = "review_required";
  if (process.env.INNGEST_EVENT_KEY) {
    try {
      await inngest.send({
        name: "jobbuddy/resume.uploaded",
        data: {
          resumeId,
          userId: user.id,
          originalName: file.name,
          textLength: resumeText.length,
          needsAiEnhancement: quality.needsAiEnhancement,
        },
      });
      status = "processing";
    } catch (error) {
      console.error("Could not enqueue resume enhancement; using local extraction:", error);
    }
  } else {
    // Local parsing is the complete synchronous path. AI enhancement must run through
    // Inngest so an unavailable/slow model never keeps the upload request open.
    console.warn("INNGEST_EVENT_KEY is not configured; returning the local resume extraction.");
  }

  if (status === "review_required") {
    await Promise.all([
      supabase.from("resumes").update({ status }).eq("id", resumeId),
      supabase.from("profiles").update({ onboarding_state: status }).eq("id", user.id),
    ]);
  }

  return NextResponse.json({ id: resumeId, mode: "supabase", status, quality }, { status: 202 });
}
