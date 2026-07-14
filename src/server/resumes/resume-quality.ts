import type { ExtractedProfile } from "./profile-schema";

export const qualityFieldLabels = {
  fullName: "Full name",
  headline: "Professional headline",
  email: "Email",
  phone: "Phone",
  location: "Location",
  summary: "Summary",
  skills: "Skills",
  targetRoles: "Target roles",
  experiences: "Experience",
  education: "Education",
} as const;

type QualityField = keyof typeof qualityFieldLabels;

const weights: Record<QualityField, number> = {
  fullName: 12,
  headline: 8,
  email: 12,
  phone: 8,
  location: 7,
  summary: 8,
  skills: 13,
  targetRoles: 8,
  experiences: 16,
  education: 8,
};

function hasValue(profile: ExtractedProfile, field: QualityField) {
  const value = profile[field];
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === "string" && value.trim().length > 0;
}

export function assessResumeExtraction(profile: ExtractedProfile) {
  const fields = Object.keys(weights) as QualityField[];
  const missingFields = fields.filter((field) => !hasValue(profile, field));
  const lowConfidenceFields = fields.filter(
    (field) => hasValue(profile, field) && (profile.confidence[field] ?? 0.65) < 0.65,
  );
  const completenessScore = fields.reduce(
    (score, field) => score + (hasValue(profile, field) ? weights[field] : 0),
    0,
  );
  const confidenceValues = fields
    .filter((field) => hasValue(profile, field))
    .map((field) => profile.confidence[field] ?? 0.65);
  const confidenceScore = confidenceValues.length
    ? Math.round((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length) * 100)
    : 0;

  return {
    completenessScore,
    confidenceScore,
    missingFields,
    lowConfidenceFields,
    reviewFields: Array.from(new Set([...missingFields, ...lowConfidenceFields])),
    needsAiEnhancement:
      completenessScore < 75 ||
      missingFields.some((field) => ["fullName", "email", "skills", "experiences"].includes(field)),
  };
}
