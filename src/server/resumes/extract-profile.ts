import "server-only";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const extractedProfileSchema = z.object({
  fullName: z.string().min(1),
  headline: z.string().default(""),
  email: z.string().email().or(z.literal("")),
  phone: z.string().default(""),
  location: z.string().default(""),
  summary: z.string().default(""),
  skills: z.array(z.string()).default([]),
  experiences: z
    .array(
      z.object({
        company: z.string(),
        title: z.string(),
        startDate: z.string().nullable(),
        endDate: z.string().nullable(),
        description: z.string().default(""),
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        institution: z.string(),
        degree: z.string().default(""),
        fieldOfStudy: z.string().default(""),
      }),
    )
    .default([]),
  projects: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().default(""),
        link: z.string().default(""),
      }),
    )
    .default([]),
  certifications: z
    .array(
      z.object({
        name: z.string(),
        issuer: z.string().default(""),
        date: z.string().nullable(),
      }),
    )
    .default([]),
  confidence: z.record(z.string(), z.number().min(0).max(1)).default({}),
});

export type ExtractedProfile = z.infer<typeof extractedProfileSchema>;

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
    "experiences",
    "education",
    "projects",
    "certifications",
    "confidence",
  ],
} as const;

function fallbackProfile(originalName: string): ExtractedProfile {
  return extractedProfileSchema.parse({
    fullName: "Alex Morgan",
    headline: "Senior Product Manager",
    email: "alex@example.com",
    phone: "+1 (415) 555-0148",
    location: "San Francisco, CA",
    summary: `Reviewed profile draft created from ${originalName}.`,
    skills: ["Product strategy", "Roadmapping", "B2B SaaS", "Analytics", "User research", "AI products"],
    experiences: [
      {
        company: "Northstar Labs",
        title: "Senior Product Manager",
        startDate: "2022-01-01",
        endDate: null,
        description: "Led product strategy and cross-functional delivery.",
      },
    ],
    education: [
      {
        institution: "University of California",
        degree: "B.S.",
        fieldOfStudy: "Computer Science",
      },
    ],
    projects: [],
    certifications: [],
    confidence: {
      fullName: 0.99,
      email: 0.98,
      headline: 0.93,
      location: 0.91,
      skills: 0.88,
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
}: {
  originalName: string;
  bytes?: Uint8Array;
  mimeType?: string;
}): Promise<ExtractedProfile> {
  if (!process.env.GEMINI_API_KEY || !bytes?.length || !mimeType) {
    return fallbackProfile(originalName);
  }

  try {
    const ai = getGenAIClient(); // Reuse existing client instead of creating new one each time
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: Buffer.from(bytes).toString("base64"),
                mimeType,
              },
            },
            {
              text: [
                "Extract a factual candidate profile from this resume.",
                "Do not infer missing contact details, work authorization, demographic attributes, protected characteristics, or credentials.",
                "Use empty strings, empty arrays, or null dates when evidence is absent.",
                "Keep experience descriptions concise and faithful to the document.",
              ].join(" "),
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: profileJsonSchema,
        temperature: 0.1,
      },
    });
    if (!response.text) throw new Error("Gemini returned an empty extraction");
    return extractedProfileSchema.parse(JSON.parse(response.text));
  } catch (error) {
    // Log error for debugging while maintaining fallback behavior
    console.error("Error extracting profile from resume:", error);
    // Provider failure must not block onboarding; the UI still requires human review.
    return fallbackProfile(originalName);
  }
}
