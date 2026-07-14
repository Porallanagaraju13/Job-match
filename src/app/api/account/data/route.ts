import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient, createServiceRoleClient } from "@/server/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Account storage is not connected." }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to export your data." }, { status: 401 });

  const [profile, preferences, skills, experiences, education, resumes, savedJobs, applications, feedback] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("job_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profile_skills").select("skill, years, source, created_at").eq("user_id", user.id),
      supabase.from("experiences").select("*").eq("user_id", user.id).order("position"),
      supabase.from("educations").select("*").eq("user_id", user.id).order("position"),
      supabase.from("resumes").select("id, original_name, mime_type, size_bytes, status, created_at").eq("user_id", user.id),
      supabase.from("saved_jobs").select("job_id, saved_at").eq("user_id", user.id),
      supabase.from("applications").select("*").eq("user_id", user.id),
      supabase.from("job_feedback").select("job_id, feedback, reason, updated_at").eq("user_id", user.id),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email, createdAt: user.created_at },
    profile: profile.data,
    preferences: preferences.data,
    skills: skills.data ?? [],
    experiences: experiences.data ?? [],
    education: education.data ?? [],
    resumes: resumes.data ?? [],
    savedJobs: savedJobs.data ?? [],
    applications: applications.data ?? [],
    jobFeedback: feedback.data ?? [],
  };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="jobmatch-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}

const deleteSchema = z.object({ confirmation: z.literal("DELETE") });

export async function DELETE(request: Request) {
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Type DELETE to confirm account deletion." }, { status: 400 });
  const supabase = await createServerSupabaseClient();
  const serviceSupabase = createServiceRoleClient();
  if (!supabase || !serviceSupabase) {
    return NextResponse.json({ error: "Account deletion is not configured." }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to delete your account." }, { status: 401 });

  const { data: resumes } = await serviceSupabase
    .from("resumes")
    .select("storage_path")
    .eq("user_id", user.id);
  const paths = (resumes ?? []).map((resume) => resume.storage_path).filter(Boolean);
  if (paths.length) await serviceSupabase.storage.from("resumes").remove(paths);

  const { error } = await serviceSupabase.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
