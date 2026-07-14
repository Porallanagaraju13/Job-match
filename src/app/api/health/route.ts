import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/server/supabase/server";

export async function GET() {
  const serviceSupabase = createServiceRoleClient();
  let enhancementsReady = false;
  if (serviceSupabase) {
    const { error } = await serviceSupabase.from("job_feedback").select("job_id").limit(1);
    enhancementsReady = !error;
  }

  return NextResponse.json({
    status: "ok",
    app: "jobmatch",
    mode:
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        ? "connected"
        : "demo",
    integrations: {
      supabase: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      ),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
      firecrawl: Boolean(process.env.FIRECRAWL_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY),
      inngest: Boolean(process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY),
      browserbase: Boolean(process.env.BROWSERBASE_API_KEY && process.env.BROWSERBASE_PROJECT_ID),
    },
    database: {
      connected: Boolean(serviceSupabase),
      enhancementsReady,
      pendingMigration: enhancementsReady ? null : "202607140001_job_quality_feedback.sql",
    },
  });
}
