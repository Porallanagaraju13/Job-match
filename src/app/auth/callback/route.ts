import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/server/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/app/jobs";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/app/jobs";
  const supabase = await createServerSupabaseClient();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const signIn = new URL("/sign-in", requestUrl.origin);
      signIn.searchParams.set("error", "auth_callback_failed");
      return NextResponse.redirect(signIn);
    }
  }

  return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
}
