import { z } from "zod";

export const extractedProfileSchema = z.object({
  fullName: z.string().default(""),
  headline: z.string().default(""),
  email: z.string().email().or(z.literal("")),
  phone: z.string().default(""),
  location: z.string().default(""),
  summary: z.string().default(""),
  skills: z.array(z.string()).default([]),
  targetRoles: z.array(z.string()).default([]),
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
