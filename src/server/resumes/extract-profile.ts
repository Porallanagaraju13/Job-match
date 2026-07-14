import "server-only";

import { GoogleGenAI } from "@google/genai";
import { extractedProfileSchema, type ExtractedProfile } from "@/server/resumes/profile-schema";
import { extractProfileFromText } from "@/server/resumes/text-profile";

export { extractedProfileSchema } from "@/server/resumes/profile-schema";
export type { ExtractedProfile } from "@/server/resumes/profile-schema";

export const RESUME_EXTRACTION_PROMPT_VERSION = "resume-extraction-v2";

const profileJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    fullName: { type: "string", description: "Candidate full name exactly as written." },
    headline: { type: "string", description: "Current or most representative professional title." },
    email: { type: "string", description: "Email address, or an empty string when absent." },
    phone: { type: "string", description: "Phone number exactly as written, or empty string." },
    location: { type: "string", description: "Candidate location, or empty string." },
    summary: {
      type: "string",
      description: "A concise factual professional summary using only resume evidence.",
    },
    skills: {
      type: "array",
      items: { type: "string" },
      description: "Explicitly stated or directly evidenced professional skills.",
    },
    targetRoles: {
      type: "array",
      items: { type: "string" },
      description:
        "Realistic job titles the candidate is qualified for based only on resume headline, skills, projects, and experience.",
    },
    experiences: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          company: { type: "string" },
          title: { type: "string" },
          startDate: { type: ["string", "null"], description: "ISO date when known, otherwise null." },
          endDate: { type: ["string", "null"], description: "ISO date when known, otherwise null." },
          description: { type: "string" },
        },
        required: ["company", "title", "startDate", "endDate", "description"],
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          institution: { type: "string" },
          degree: { type: "string" },
          fieldOfStudy: { type: "string" },
        },
        required: ["institution", "degree", "fieldOfStudy"],
      },
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          link: { type: "string", description: "URL or link if available, or empty string." },
        },
        required: ["name", "description", "link"],
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          issuer: { type: "string" },
          date: { type: ["string", "null"], description: "ISO date when known, otherwise null." },
        },
        required: ["name", "issuer", "date"],
      },
    },
    confidence: {
      type: "object",
      additionalProperties: { type: "number", minimum: 0, maximum: 1 },
      description: "Per-field confidence scores between zero and one.",
    },
  },
  required: [
    "fullName",
    "headline",
    "email",
    "phone",
    "location",
    "summary",
    "skills",
    "targetRoles",
    "experiences",
    "education",
    "projects",
    "certifications",
    "confidence",
  ],
} as const;

function fallbackProfile(originalName: string): ExtractedProfile {
  return extractedProfileSchema.parse({
    fullName: "",
    headline: "",
    email: "",
    phone: "",
    location: "",
    summary: `We could not extract reliable profile details from ${originalName}. Review and add your details manually.`,
    skills: [],
    targetRoles: [],
    experiences: [],
    education: [],
    projects: [],
    certifications: [],
    confidence: {
      extractionFallback: 1,
    },
  });
}

function mergeWithLocalDraft(profile: ExtractedProfile, localDraft: ExtractedProfile | null) {
  if (!localDraft) return profile;

  return extractedProfileSchema.parse({
    ...profile,
    fullName: profile.fullName || localDraft.fullName,
    headline: profile.headline || localDraft.headline,
    email: profile.email || localDraft.email,
    phone: profile.phone || localDraft.phone,
    location: profile.location || localDraft.location,
    summary: profile.summary || localDraft.summary,
    skills: profile.skills.length ? profile.skills : localDraft.skills,
    targetRoles: profile.targetRoles.length ? profile.targetRoles : localDraft.targetRoles,
    experiences: profile.experiences.length ? profile.experiences : localDraft.experiences,
    education: profile.education.length ? profile.education : localDraft.education,
    projects: profile.projects.length ? profile.projects : localDraft.projects,
    certifications: profile.certifications.length ? profile.certifications : localDraft.certifications,
    confidence: {
      ...localDraft.confidence,
      ...profile.confidence,
    },
  });
}

// Create a singleton client instance for performance
let genAIClient: GoogleGenAI | null = null;

function getGenAIClient(): GoogleGenAI {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  if (!genAIClient) {
    throw new Error("GEMINI_API_KEY not configured");
  }
  return genAIClient;
}

export async function extractProfileFromResume({
  originalName,
  bytes,
  mimeType,
  textHint,
}: {
  originalName: string;
  bytes?: Uint8Array;
  mimeType?: string;
  textHint?: string;
}): Promise<ExtractedProfile> {
  const localDraft =
    textHint && textHint.trim().length > 80 ? extractProfileFromText(textHint, originalName) : null;

  if (!process.env.GEMINI_API_KEY) {
    return localDraft ?? fallbackProfile(originalName);
  }

  if (!localDraft && (!bytes?.length || !mimeType)) {
    return fallbackProfile(originalName);
  }

  try {
    const ai = getGenAIClient(); // Reuse existing client instead of creating new one each time
    const contentParts = localDraft
      ? [
          {
            text: [
              "Extract a factual candidate profile from this resume text.",
              "The text was already extracted locally from the uploaded file.",
              "Extract exact values as written — do not paraphrase, rephrase, or infer missing information.",
              "Include all phone number digits including country code exactly as shown.",
              "Copy the email address character-for-character.",
              "Do not infer work authorization, demographic attributes, protected characteristics, or credentials.",
              "Use empty strings, empty arrays, or null dates when evidence is absent.",
              "Keep experience descriptions concise and faithful to the document.",
              "Return every resume section that is present, including projects, certifications, education, links, and achievements.",
              "Set targetRoles to accurate job titles supported by the candidate's resume evidence.",
              `Resume text:\n${textHint!.slice(0, 80_000)}`,
            ].join(" "),
          },
        ]
      : [
          {
            inlineData: {
              data: Buffer.from(bytes!).toString("base64"),
              mimeType: mimeType!,
            },
          },
          {
            text: [
              "Extract a factual candidate profile from this resume.",
              "Extract exact values as written — do not paraphrase, rephrase, or infer missing information.",
              "Include all phone number digits including country code exactly as shown.",
              "Copy the email address character-for-character.",
              "Do not infer work authorization, demographic attributes, protected characteristics, or credentials.",
              "Use empty strings, empty arrays, or null dates when evidence is absent.",
              "Keep experience descriptions concise and faithful to the document.",
              "Return every resume section that is present, including projects, certifications, education, links, and achievements.",
              "Set targetRoles to accurate job titles supported by the candidate's resume evidence.",
            ].join(" "),
          },
        ];
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: contentParts,
        },
      ],
      config: {
        httpOptions: { timeout: Number(process.env.GEMINI_TIMEOUT_MS ?? 20_000) },
        responseMimeType: "application/json",
        responseJsonSchema: profileJsonSchema,
        temperature: 0.1,
      },
    });
    if (!response.text) throw new Error("Gemini returned an empty extraction");
    console.info("Resume AI extraction completed", {
      promptVersion: RESUME_EXTRACTION_PROMPT_VERSION,
      model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
      inputTokens: response.usageMetadata?.promptTokenCount ?? null,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
    });
    return mergeWithLocalDraft(extractedProfileSchema.parse(JSON.parse(response.text)), localDraft);
  } catch (error) {
    // Log error for debugging while maintaining fallback behavior
    console.error("Error extracting profile from resume:", error);
    // Provider failure must not block onboarding; the UI still requires human review.
    return localDraft ?? fallbackProfile(originalName);
  }
}
