import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { inngest } from "@/server/inngest/client";
import { extractProfileFromResume } from "@/server/resumes/extract-profile";
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
    const extraction = await extractProfileFromResume({
      originalName: file.name,
      bytes,
      mimeType: file.type || "application/pdf",
    });
    return NextResponse.json({
      id,
      mode: "demo",
      status: "review_required",
      sha256,
      extraction,
    });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in before uploading a resume." }, { status: 401 });

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

  if (process.env.INNGEST_EVENT_KEY) {
    await inngest.send({
      name: "jobbuddy/resume.uploaded",
      data: { resumeId, userId: user.id, originalName: file.name },
    });
  } else {
    const extraction = await extractProfileFromResume({
      originalName: file.name,
      bytes,
      mimeType,
    });
    await supabase.from("resume_extractions").insert({
      user_id: user.id,
      resume_id: resumeId,
      parser_version: "fallback-v1",
      raw_data: extraction,
      confidence_map: extraction.confidence,
    });
    
    // Automatically map extracted data to profile
    const { upsertProfileFromExtraction } = await import("@/server/profile/repository");
    await upsertProfileFromExtraction(supabase, user.id, extraction);

    await supabase.from("resumes").update({ status: "review_required" }).eq("id", resumeId);
    await supabase.from("profiles").update({ onboarding_state: "review_required" }).eq("id", user.id);
  }

  return NextResponse.json({ id: resumeId, mode: "supabase", status: "processing" }, { status: 202 });
}
