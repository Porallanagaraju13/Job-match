import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/server/inngest/client";
import { createServerSupabaseClient } from "@/server/supabase/server";

const requestSchema = z.object({ jobId: z.string().min(1) });
const updateSchema = z.object({
  applicationId: z.string().min(1),
  state: z.enum(["ready_for_review", "submitted"]),
});

async function markApplicationReady({
  supabase,
  applicationId,
  userId,
  applyUrl,
}: {
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;
  applicationId: string;
  userId: string;
  applyUrl: string;
}) {
  try {
    const { scanApplicationForm } = await import("@/server/applications/browserbase");
    const scan = await scanApplicationForm(applyUrl);

    await supabase
      .from("applications")
      .update({
        state: "ready_for_review",
        current_step: "review",
        provider_run_id: scan.sessionId ?? null,
        failure_message: null,
      })
      .eq("id", applicationId)
      .eq("user_id", userId);
  } catch (error) {
    console.error("Application preparation failed; falling back to review state:", error);
    await supabase
      .from("applications")
      .update({
        state: "needs_input",
        current_step: "manual_fallback",
        failure_code: "BROWSERBASE_ERROR",
        failure_message:
          error instanceof Error
            ? error.message
            : "Application automation could not scan the form.",
      })
      .eq("id", applicationId)
      .eq("user_id", userId);
  }
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A valid job ID is required." }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  if (!supabase || !z.string().uuid().safeParse(parsed.data.jobId).success) {
    return NextResponse.json({ id: "app_preview", mode: "demo", state: "ready_for_review" });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to start an application." }, { status: 401 });

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, apply_url, job_sources(platform)")
    .eq("id", parsed.data.jobId)
    .is("closed_at", null)
    .single();
  if (jobError || !job) return NextResponse.json({ error: "This job is no longer available." }, { status: 404 });

  const applicationId = randomUUID();
  const idempotencyKey = `${user.id}:${job.id}:${new Date().toISOString().slice(0, 10)}`;
  const { data: application, error } = await supabase
    .from("applications")
    .upsert(
      {
        id: applicationId,
        user_id: user.id,
        job_id: job.id,
        mode: "assisted",
        state: "queued",
        current_step: "scan",
        idempotency_key: idempotencyKey,
      },
      { onConflict: "user_id,idempotency_key" },
    )
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sourceRelation = job.job_sources as unknown as { platform?: string } | null;
  if (process.env.INNGEST_EVENT_KEY) {
    try {
      await inngest.send({
        name: "jobbuddy/application.prepare.requested",
        data: {
          applicationId: application.id,
          userId: user.id,
          applyUrl: job.apply_url,
          platform: sourceRelation?.platform ?? "unknown",
        },
      });
      return NextResponse.json({ id: application.id, mode: "supabase", state: "queued" }, { status: 202 });
    } catch (error) {
      console.error("Could not enqueue application preparation; preparing synchronously:", error);
    }
  }

  await markApplicationReady({
    supabase,
    applicationId: application.id,
    userId: user.id,
    applyUrl: job.apply_url,
  });

  return NextResponse.json({ id: application.id, mode: "supabase", state: "ready_for_review" }, { status: 200 });
}

export async function PATCH(request: Request) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid application update is required." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase || !z.string().uuid().safeParse(parsed.data.applicationId).success) {
    return NextResponse.json({ mode: "demo", state: parsed.data.state });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to update an application." }, { status: 401 });

  const { error } = await supabase
    .from("applications")
    .update({
      state: parsed.data.state,
      current_step: parsed.data.state === "submitted" ? "submitted" : "review",
      submitted_at: parsed.data.state === "submitted" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.applicationId)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send confirmation email/notification when application is submitted
  if (parsed.data.state === "submitted") {
    const { data: appData } = await supabase
      .from("applications")
      .select("id, jobs(title, apply_url, companies(name), job_sources(platform))")
      .eq("id", parsed.data.applicationId)
      .single();

    const job = appData?.jobs as unknown as {
      title?: string;
      companies?: { name?: string } | { name?: string }[] | null;
      job_sources?: { platform?: string } | null;
    } | null;

    const { sendApplicationConfirmation } = await import("@/server/applications/send-confirmation");
    await sendApplicationConfirmation({
      userId: user.id,
      applicationId: parsed.data.applicationId,
      company: Array.isArray(job?.companies) ? job.companies[0]?.name : job?.companies?.name,
      role: job?.title,
      source: (job?.job_sources as { platform?: string } | null)?.platform,
    }).catch((err) => console.error("[applications/PATCH] confirmation error:", err));
  }

  return NextResponse.json({ mode: "supabase", state: parsed.data.state });
}
