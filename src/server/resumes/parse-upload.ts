import "server-only";

import { assessResumeExtraction } from "@/server/resumes/resume-quality";
import { extractProfileFromText } from "@/server/resumes/text-profile";
import { extractResumeText } from "@/server/resumes/text-extraction";

export class ResumeParsingError extends Error {
  status = 422;

  constructor(message: string) {
    super(message);
    this.name = "ResumeParsingError";
  }
}

function hasMeaningfulResumeText(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length >= 40 && /[A-Za-z]{3,}/.test(normalized);
}

export async function parseUploadedResume({
  bytes,
  mimeType,
  originalName,
}: {
  bytes: Uint8Array;
  mimeType: string;
  originalName: string;
}) {
  const text = await extractResumeText({ bytes, mimeType, originalName });

  if (!hasMeaningfulResumeText(text)) {
    throw new ResumeParsingError(
      "We could not read enough text from this resume. Upload a text-based PDF or DOCX file, not a scanned image.",
    );
  }

  const extraction = extractProfileFromText(text, originalName);
  const quality = assessResumeExtraction(extraction);

  return { text, extraction, quality };
}
