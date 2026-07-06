import { NextResponse } from "next/server";
import { getStripe } from "@/server/stripe/client";
import { createServerSupabaseClient } from "@/server/supabase/server";

export async function POST(request: Request) {
  const stripe = getStripe();
  const supabase = await createServerSupabaseClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  if (!stripe || !supabase) {
    return NextResponse.json({ mode: "demo", url: "/app/billing?portal=demo" });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage billing." }, { status: 401 });

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();
  if (!subscription?.stripe_customer_id) {
    return NextResponse.json({ error: "No Stripe customer exists for this account." }, { status: 404 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${appUrl}/app/billing`,
  });
  return NextResponse.json({ mode: "stripe", url: session.url });
}
