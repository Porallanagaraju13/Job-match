import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/server/supabase/server";

function calculateProfileCompletion(profile: {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  experiences: Array<{
    company: string;
    title: string;
    startDate: string | null;
    endDate: string | null;
    description: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    fieldOfStudy: string;
  }>;
}): number {
  const checks = [
    Boolean(profile.fullName && profile.email && profile.phone && profile.location), // Basic Info
    Boolean(profile.summary),                                                       // Summary
    Boolean(profile.headline),                                                      // Work Experience
    Boolean(profile.education.length > 0),                                          // Education
    profile.skills.length > 0,                                                      // Skills
    /* Note: Resume status would need to be fetched separately */
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

const preferencesSchema = z.object({
  targetRoles: z.array(z.string().min(1)).min(1).max(20),
  preferredLocations: z.array(z.string().min(1)).max(20),
  workModes: z.array(z.enum(["Remote", "Hybrid", "On-site"])).min(1),
  seniorityLevels: z.array(z.string()).default(["Senior", "Lead"]),
  minimumSalary: z.number().int().nonnegative().nullable(),
  salaryCurrency: z.string().length(3).default("USD"),
});

export async function GET() {
  const defaultPreferences = {
    targetRoles: ["Senior Product Manager", "Product Lead", "Group Product Manager"],
    preferredLocations: ["San Francisco, CA"],
    workModes: ["Remote", "Hybrid"],
    seniorityLevels: ["Senior", "Lead"],
    minimumSalary: 140000,
    salaryCurrency: "USD",
  };

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json(defaultPreferences);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(defaultPreferences);

  const { data } = await supabase
    .from("job_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return NextResponse.json(defaultPreferences);

  return NextResponse.json({
    targetRoles: data.target_roles ?? defaultPreferences.targetRoles,
    preferredLocations: data.preferred_locations ?? defaultPreferences.preferredLocations,
    workModes: data.work_modes ?? defaultPreferences.workModes,
    seniorityLevels: data.seniority_levels ?? defaultPreferences.seniorityLevels,
    minimumSalary: data.minimum_salary ?? defaultPreferences.minimumSalary,
    salaryCurrency: data.salary_currency ?? defaultPreferences.salaryCurrency,
  });
}

export async function POST(request: Request) {
  const parsed = preferencesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose at least one role and work mode." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ mode: "demo", saved: true });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to save preferences." }, { status: 401 });

  const value = parsed.data;
  const { error } = await supabase.from("job_preferences").upsert({
    user_id: user.id,
    target_roles: value.targetRoles,
    preferred_locations: value.preferredLocations,
    work_modes: value.workModes,
    seniority_levels: value.seniorityLevels,
    minimum_salary: value.minimumSalary,
    salary_currency: value.salaryCurrency,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch user's profile to calculate completeness
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, headline, email, phone, location, summary")
      .eq("id", user.id)
      .single();

    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

    // Get skills for the user
    const { data: skillsData, error: skillsError } = await supabase
      .from("profile_skills")
      .select("skill")
      .eq("user_id", user.id);

    if (skillsError) return NextResponse.json({ error: skillsError.message }, { status: 500 });

    // Get experiences for the user
    const { data: experiencesData, error: experiencesError } = await supabase
      .from("experiences")
      .select("company, title, start_date, end_date, description")
      .eq("user_id", user.id);

    if (experiencesError) return NextResponse.json({ error: experiencesError.message }, { status: 500 });

    // Get education for the user
    const { data: educationData, error: educationError } = await supabase
      .from("educations")
      .select("institution, degree, field_of_study")
      .eq("user_id", user.id);

    if (educationError) return NextResponse.json({ error: educationError.message }, { status: 500 });

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({
        onboarding_state: "ready",
        completeness: calculateProfileCompletion({
          fullName: profile?.full_name ?? "",
          headline: profile?.headline ?? "",
          email: profile?.email ?? "",
          phone: profile?.phone ?? "",
          location: profile?.location ?? "",
          summary: profile?.summary ?? "",
          skills: skillsData?.map(s => s.skill) ?? [],
          experiences: experiencesData?.map(exp => ({
            company: exp.company,
            title: exp.title,
            startDate: exp.start_date,
            endDate: exp.end_date,
            description: exp.description
          })) ?? [],
          education: educationData?.map(edu => ({
            institution: edu.institution,
            degree: edu.degree,
            fieldOfStudy: edu.field_of_study
          })) ?? [],
        })
      })
      .eq("id", user.id);
    if (profileUpdateError) return NextResponse.json({ error: profileUpdateError.message }, { status: 500 });

  return NextResponse.json({ mode: "supabase", saved: true });
}
