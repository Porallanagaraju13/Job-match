import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileDraft } from "@/lib/types";
import { extractedProfileSchema } from "@/server/resumes/profile-schema";
import { assessResumeExtraction } from "@/server/resumes/resume-quality";
import { inferTargetRoles } from "@/server/resumes/role-inference";
import { createServerSupabaseClient } from "@/server/supabase/server";

function metadataValue(metadata: unknown, ...keys: string[]) {
  if (!metadata || typeof metadata !== "object") return "";
  const record = metadata as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function isLegacyDemoProfile(value: {
  full_name?: string | null;
  email?: string | null;
  summary?: string | null;
} | null | undefined) {
  return (
    value?.full_name === "Alex Morgan" &&
    (value.email === "alex@example.com" ||
      value.summary?.startsWith("Reviewed profile draft created from "))
  );
}

function isFallbackExtraction(value: unknown) {
  const extracted = extractedProfileSchema.safeParse(value);
  if (!extracted.success) return false;
  return (
    extracted.data.confidence.extractionFallback === 1 ||
    (extracted.data.fullName === "Alex Morgan" && extracted.data.email === "alex@example.com")
  );
}

export async function getProfileDraftForCurrentUser(): Promise<ProfileDraft> {
  const emptyProfile: ProfileDraft = {
    fullName: "",
    headline: "",
    email: "",
    phone: "",
    location: "",
    summary: "",
    skills: [],
    targetRoles: [],
    experiences: [],
    education: [],
    projects: [],
    certifications: [],
  };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return emptyProfile;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return emptyProfile;
  const accountFullName = metadataValue(user.user_metadata, "full_name", "name");
  const accountEmail = user.email ?? "";

  const [
    { data: profile },
    { data: skills },
    { data: extraction },
    { data: preferences },
    { data: experiences },
    { data: education },
  ] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, headline, email, phone, location, summary")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("profile_skills").select("skill").eq("user_id", user.id).order("skill"),
      supabase
        .from("resume_extractions")
        .select("raw_data")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("job_preferences")
        .select("target_roles")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("experiences")
        .select("company, title, start_date, end_date, description")
        .eq("user_id", user.id)
        .order("position"),
      supabase
        .from("educations")
        .select("institution, degree, field_of_study")
        .eq("user_id", user.id)
        .order("position"),
    ]);

  const extracted = extractedProfileSchema.safeParse(extraction?.raw_data);
  const extractedValue = extracted.success && !isFallbackExtraction(extraction?.raw_data) ? extracted.data : null;
  const storedProfile = isLegacyDemoProfile(profile) ? null : profile;
  const storedSkills = storedProfile ? (skills ?? []).map((item) => item.skill).filter(Boolean) : [];
  const storedExperiences =
    storedProfile && experiences?.length
      ? experiences.map((experience) => ({
          company: experience.company,
          title: experience.title,
          startDate: experience.start_date,
          endDate: experience.end_date,
          description: experience.description ?? "",
        }))
      : [];
  const storedEducation =
    storedProfile && education?.length
      ? education.map((item) => ({
          institution: item.institution,
          degree: item.degree ?? "",
          fieldOfStudy: item.field_of_study ?? "",
        }))
      : [];
  const targetRoles = Array.isArray(preferences?.target_roles)
    ? preferences.target_roles.filter((role): role is string => typeof role === "string")
    : [];

  return {
    fullName: storedProfile?.full_name || accountFullName || extractedValue?.fullName || "",
    headline: storedProfile?.headline || extractedValue?.headline || "",
    email: storedProfile?.email || accountEmail || extractedValue?.email || "",
    phone: storedProfile?.phone || extractedValue?.phone || "",
    location: storedProfile?.location || extractedValue?.location || "",
    summary: storedProfile?.summary || extractedValue?.summary || "",
    skills: storedSkills.length ? storedSkills : extractedValue?.skills ?? [],
    targetRoles: targetRoles.length ? targetRoles : extractedValue?.targetRoles ?? [],
    experiences: storedExperiences.length ? storedExperiences : extractedValue?.experiences ?? [],
    education: storedEducation.length ? storedEducation : extractedValue?.education ?? [],
    projects: extractedValue?.projects ?? [],
    certifications: extractedValue?.certifications ?? [],
    extractionQuality: extractedValue ? assessResumeExtraction(extractedValue) : undefined,
  };
}

export async function upsertProfileFromExtraction(
  supabase: SupabaseClient,
  userId: string,
  extraction: unknown,
) {
  const extracted = extractedProfileSchema.safeParse(extraction);
  if (!extracted.success) return;

  const { data } = extracted;
  if (isFallbackExtraction(data)) return;
  const targetRoles = data.targetRoles.length
    ? data.targetRoles
    : inferTargetRoles({
        headline: data.headline,
        summary: data.summary,
        skills: data.skills,
        experiences: data.experiences,
      });

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("full_name, headline, email, phone, location, summary")
    .eq("id", userId)
    .maybeSingle();

  // Update profile
  await supabase
    .from("profiles")
    .update({
      full_name: data.fullName || existingProfile?.full_name || null,
      headline: data.headline || existingProfile?.headline || null,
      email: data.email || existingProfile?.email || null,
      phone: data.phone || existingProfile?.phone || null,
      location: data.location || existingProfile?.location || null,
      summary: data.summary || existingProfile?.summary || null,
    })
    .eq("id", userId);

  // Update skills (delete existing and insert new ones)
  if (data.skills && data.skills.length > 0) {
    await supabase.from("profile_skills").delete().eq("user_id", userId);
    await supabase.from("profile_skills").insert(
      data.skills.map((skill) => ({
        user_id: userId,
        skill,
      }))
    );
  }

  if (data.experiences.length) {
    await supabase.from("experiences").delete().eq("user_id", userId);
    await supabase.from("experiences").insert(
      data.experiences.map((experience, position) => ({
        user_id: userId,
        company: experience.company,
        title: experience.title,
        start_date: experience.startDate,
        end_date: experience.endDate,
        is_current: experience.endDate === null,
        description: experience.description,
        position,
      })),
    );
  }

  if (data.education.length) {
    await supabase.from("educations").delete().eq("user_id", userId);
    await supabase.from("educations").insert(
      data.education.map((education, position) => ({
        user_id: userId,
        institution: education.institution,
        degree: education.degree,
        field_of_study: education.fieldOfStudy,
        position,
      })),
    );
  }

  if (targetRoles.length) {
    const { data: existingPreferences } = await supabase
      .from("job_preferences")
      .select("preferred_locations, work_modes, seniority_levels, minimum_salary, salary_currency")
      .eq("user_id", userId)
      .maybeSingle();

    await supabase.from("job_preferences").upsert(
      {
        user_id: userId,
        target_roles: targetRoles,
        preferred_locations:
          Array.isArray(existingPreferences?.preferred_locations) && existingPreferences.preferred_locations.length
            ? existingPreferences.preferred_locations
            : data.location
              ? [data.location]
              : [],
        work_modes:
          Array.isArray(existingPreferences?.work_modes) && existingPreferences.work_modes.length
            ? existingPreferences.work_modes
            : ["Remote", "Hybrid", "On-site"],
        seniority_levels:
          Array.isArray(existingPreferences?.seniority_levels) && existingPreferences.seniority_levels.length
            ? existingPreferences.seniority_levels
            : ["Entry", "Junior", "Mid", "Senior", "Lead"],
        minimum_salary: existingPreferences?.minimum_salary ?? null,
        salary_currency: existingPreferences?.salary_currency ?? "USD",
      },
      { onConflict: "user_id" },
    );
  }
}
