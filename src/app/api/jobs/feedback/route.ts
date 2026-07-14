import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/server/supabase/server";

const feedbackSchema = z.object({
  jobId: z.string().uuid(),
  feedback: z.enum(["relevant", "not_relevant", "hidden"]),
  reason: z.string().trim().max(240).optional(),
});

export async function POST(request: Request) {
  const parsed = feedbackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Valid job feedback is required." }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ mode: "demo", saved: true });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to save job feedback." }, { status: 401 });

  const { error } = await supabase.from("job_feedback").upsert(
    {
      user_id: user.id,
      job_id: parsed.data.jobId,
      feedback: parsed.data.feedback,
      reason: parsed.data.reason || null,
    },
    { onConflict: "user_id,job_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("activity_events").insert({
    user_id: user.id,
    event_type: "job.feedback",
    safe_metadata: { jobId: parsed.data.jobId, feedback: parsed.data.feedback },
  });

  return NextResponse.json({ saved: true, feedback: parsed.data.feedback });
}
