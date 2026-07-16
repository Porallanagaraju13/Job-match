import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { inngest } from "@/server/inngest/client";
import { parseUploadedResume, ResumeParsingError } from "@/server/resumes/parse-upload";
import { createServerSupabaseClient, createServiceRoleClient } from "@/server/supabase/server";

export const runtime = "nodejs";

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

function jsonError(error: unknown) {
  if (error instanceof ResumeParsingError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("Resume upload failed", error);
  return NextResponse.json(
    {
      error:
        "We could not process this resume right now. Please try again, or upload a text-based PDF or DOCX file.",
    },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  try {
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

    const mimeType = file.type || "application/octet-stream";
    const parsedResume = await parseUploadedResume({ bytes, mimeType, originalName: file.name });
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return NextResponse.json({
        id: randomUUID(),
        mode: "demo",
        status: "review_required",
        sha256,
        extraction: parsedResume.extraction,
        quality: parsedResume.quality,
      });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in before uploading a resume." }, { status: 401 });
    const processingSupabase = createServiceRoleClient();
    if (!processingSupabase) {
      return NextResponse.json(
        { error: "Resume processing service is not configured. Add SUPABASE_SECRET_KEY and try again." },
        { status: 500 },
      );
    }

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
      processing_error: null,
    });
    if (resumeError) {
      await supabase.storage.from("resumes").remove([storagePath]);
      return NextResponse.json({ error: resumeError.message }, { status: 500 });
    }

    try {
      const { error: processingStateError } = await processingSupabase
        .from("profiles")
        .update({ onboarding_state: "processing" })
        .eq("id", user.id);
      if (processingStateError) throw processingStateError;

      const { error: extractionError } = await processingSupabase.from("resume_extractions").insert({
        user_id: user.id,
        resume_id: resumeId,
        parser_version: "local-text-v2",
        raw_data: parsedResume.extraction,
        confidence_map: parsedResume.extraction.confidence,
      });
      if (extractionError) throw extractionError;

      const { upsertProfileFromExtraction } = await import("@/server/profile/repository");
      await upsertProfileFromExtraction(processingSupabase, user.id, parsedResume.extraction);
    } catch (error) {
      console.error("Resume processing failed after upload", error);
      const processingError =
        "We uploaded the file, but could not finish extracting your profile. Please try again.";
      await Promise.allSettled([
        processingSupabase
          .from("resumes")
          .update({ status: "failed", is_active: false, processing_error: processingError })
          .eq("id", resumeId)
          .eq("user_id", user.id),
        processingSupabase.from("profiles").update({ onboarding_state: "resume_required" }).eq("id", user.id),
      ]);
      return NextResponse.json({ error: processingError, id: resumeId, status: "failed" }, { status: 500 });
    }

    let status: "processing" | "review_required" = "review_required";
    if (process.env.INNGEST_EVENT_KEY) {
      try {
        await inngest.send({
          name: "jobbuddy/resume.uploaded",
          data: {
            resumeId,
            userId: user.id,
            originalName: file.name,
            textLength: parsedResume.text.length,
            needsAiEnhancement: parsedResume.quality.needsAiEnhancement,
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
        processingSupabase
          .from("resumes")
          .update({ status, processing_error: null })
          .eq("id", resumeId)
          .eq("user_id", user.id),
        processingSupabase.from("profiles").update({ onboarding_state: status }).eq("id", user.id),
      ]);
    }

    return NextResponse.json(
      { id: resumeId, mode: "supabase", status, quality: parsedResume.quality },
      { status: 202 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
