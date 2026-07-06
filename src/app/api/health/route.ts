import { NextResponse } from "next/server";

export function GET() {
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
  });
}
