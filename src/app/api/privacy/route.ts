import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/server/supabase/server";

const privacySchema = z.object({
  retainAutomationRecordings: z.boolean(),
  improvePersonalMatching: z.boolean(),
  resumeRetentionDays: z.number().int().min(30).max(3650),
});

const defaults = {
  retainAutomationRecordings: true,
  improvePersonalMatching: true,
  resumeRetentionDays: 365,
};

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ mode: "demo", settings: defaults });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to view privacy settings." }, { status: 401 });

  const { data } = await supabase
    .from("user_privacy_settings")
    .select("retain_automation_recordings, improve_personal_matching, resume_retention_days")
    .eq("user_id", user.id)
    .maybeSingle();
  return NextResponse.json({
    settings: data
      ? {
          retainAutomationRecordings: data.retain_automation_recordings,
          improvePersonalMatching: data.improve_personal_matching,
          resumeRetentionDays: data.resume_retention_days,
        }
      : defaults,
  });
}

export async function POST(request: Request) {
  const parsed = privacySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Valid privacy settings are required." }, { status: 400 });
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ mode: "demo", saved: true });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to save privacy settings." }, { status: 401 });

  const { error } = await supabase.from("user_privacy_settings").upsert(
    {
      user_id: user.id,
      retain_automation_recordings: parsed.data.retainAutomationRecordings,
      improve_personal_matching: parsed.data.improvePersonalMatching,
      resume_retention_days: parsed.data.resumeRetentionDays,
    },
    { onConflict: "user_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: true });
}
