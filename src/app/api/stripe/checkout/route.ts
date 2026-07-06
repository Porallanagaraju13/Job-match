import { NextResponse } from "next/server";
import { z } from "zod";
import { plans, type PlanCode } from "@/config/plans";
import { getStripe } from "@/server/stripe/client";
import { createServerSupabaseClient } from "@/server/supabase/server";

const checkoutSchema = z.object({ plan: z.enum(["pro", "power"]) });

export async function POST(request: Request) {
  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid paid plan." }, { status: 400 });

  const plan = plans.find((item) => item.code === (parsed.data.plan as PlanCode));
  const stripe = getStripe();
  const supabase = await createServerSupabaseClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  if (!stripe || !supabase || !plan?.priceId) {
    return NextResponse.json({
      mode: "demo",
      demoUrl: `/app/billing?checkout=demo&plan=${parsed.data.plan}`,
    });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in before upgrading." }, { status: 401 });

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = subscription?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await supabase
      .from("subscriptions")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: plan.priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${appUrl}/app/billing?checkout=success`,
    cancel_url: `${appUrl}/pricing?checkout=cancelled`,
    metadata: { userId: user.id, plan: plan.code },
    subscription_data: { metadata: { userId: user.id, plan: plan.code } },
  });

  return NextResponse.json({ mode: "stripe", url: session.url });
}
