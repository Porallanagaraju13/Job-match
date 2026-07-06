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
}): number {
  const checks = [
    Boolean(profile.fullName && profile.email && profile.phone && profile.location), // Basic Info
    Boolean(profile.summary),                                                       // Summary
    Boolean(profile.headline),                                                      // Work Experience (headline)
    profile.skills.length > 0,                                                      // Skills
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  headline: z.string().trim().max(180),
  email: z.string().email(),
  phone: z.string().trim().max(40),
  location: z.string().trim().max(180),
  summary: z.string().trim().max(3000),
  skills: z.array(z.string().trim().min(1).max(80)).max(80),
});

export async function POST(request: Request) {
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Review the profile fields and try again." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ mode: "demo", saved: true });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to save your profile." }, { status: 401 });

  const { fullName, headline, email, phone, location, summary, skills } = parsed.data;
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      headline,
      email,
      phone,
      location,
      summary,
      completeness: calculateProfileCompletion({
        fullName,
        headline,
        email,
        phone,
        location,
        summary,
        skills,
      }),
      onboarding_state: "preferences_required",
    })
    .eq("id", user.id);
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  const { error: deleteError } = await supabase.from("profile_skills").delete().eq("user_id", user.id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  if (skills.length) {
    const { error: skillsError } = await supabase
      .from("profile_skills")
      .insert(skills.map((skill) => ({ user_id: user.id, skill, source: "user" })));
    if (skillsError) return NextResponse.json({ error: skillsError.message }, { status: 500 });
  }

  return NextResponse.json({ mode: "supabase", saved: true });
}
