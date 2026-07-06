import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/server/supabase/server";

const savedJobSchema = z.object({ jobId: z.string().uuid() });
const demoSaved = ["job-1", "job-2"];

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ mode: "demo", jobIds: demoSaved });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ mode: "demo", jobIds: demoSaved });

  const { data, error } = await supabase
    .from("saved_jobs")
    .select("job_id")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mode: "supabase", jobIds: data.map((row) => row.job_id) });
}

export async function POST(request: Request) {
  const parsed = savedJobSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ mode: "demo", saved: true });
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ mode: "demo", saved: true });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to save jobs." }, { status: 401 });
  const { error } = await supabase
    .from("saved_jobs")
    .upsert({ user_id: user.id, job_id: parsed.data.jobId }, { onConflict: "user_id,job_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mode: "supabase", saved: true });
}

export async function DELETE(request: Request) {
  const parsed = savedJobSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ mode: "demo", saved: false });
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ mode: "demo", saved: false });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to update saved jobs." }, { status: 401 });
  const { error } = await supabase
    .from("saved_jobs")
    .delete()
    .eq("user_id", user.id)
    .eq("job_id", parsed.data.jobId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mode: "supabase", saved: false });
}
