import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileDraft } from "@/lib/types";
import { extractedProfileSchema } from "@/server/resumes/extract-profile";
import { createServerSupabaseClient } from "@/server/supabase/server";

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
  const extractedValue = extracted.success ? extracted.data : null;
  const storedSkills = (skills ?? []).map((item) => item.skill).filter(Boolean);
  const targetRoles = Array.isArray(preferences?.target_roles)
    ? preferences.target_roles.filter((role): role is string => typeof role === "string")
    : [];

  return {
    fullName: profile?.full_name || extractedValue?.fullName || user.user_metadata.full_name || "",
    headline: profile?.headline || extractedValue?.headline || "",
    email: profile?.email || extractedValue?.email || user.email || "",
    phone: profile?.phone || extractedValue?.phone || "",
    location: profile?.location || extractedValue?.location || "",
    summary: profile?.summary || extractedValue?.summary || "",
    skills: storedSkills.length ? storedSkills : extractedValue?.skills ?? [],
    targetRoles,
    experiences:
      experiences?.length
        ? experiences.map((experience) => ({
            company: experience.company,
            title: experience.title,
            startDate: experience.start_date,
            endDate: experience.end_date,
            description: experience.description ?? "",
          }))
        : extractedValue?.experiences ?? [],
    education:
      education?.length
        ? education.map((item) => ({
            institution: item.institution,
            degree: item.degree ?? "",
            fieldOfStudy: item.field_of_study ?? "",
          }))
        : extractedValue?.education ?? [],
    projects: extractedValue?.projects ?? [],
    certifications: extractedValue?.certifications ?? [],
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

  // Update profile
  await supabase
    .from("profiles")
    .update({
      full_name: data.fullName,
      headline: data.headline,
      email: data.email,
      phone: data.phone,
      location: data.location,
      summary: data.summary,
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

  await supabase.from("experiences").delete().eq("user_id", userId);
  if (data.experiences.length) {
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

  await supabase.from("educations").delete().eq("user_id", userId);
  if (data.education.length) {
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
}
