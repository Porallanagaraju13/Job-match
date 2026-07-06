import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripe } from "@/server/stripe/client";
import { createServiceRoleClient } from "@/server/supabase/server";

function toIso(unixSeconds: number | null | undefined) {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}

function planFromPriceId(priceId: string | undefined) {
  if (priceId && priceId === process.env.STRIPE_POWER_PRICE_ID) return "power";
  if (priceId && priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  return "free";
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const supabase = createServiceRoleClient();
  const userId = subscription.metadata.userId;
  if (!supabase || !userId) return;

  const item = subscription.items.data[0];
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const planCode =
    subscription.status === "canceled" ? "free" : subscription.metadata.plan || planFromPriceId(item?.price.id);

  const { error } = await supabase.from("subscriptions").upsert({
    user_id: userId,
    plan_code: planCode,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    current_period_start: toIso(item?.current_period_start),
    current_period_end: toIso(item?.current_period_end),
    cancel_at_period_end: subscription.cancel_at_period_end,
  });
  if (error) throw error;
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!stripe || !secret || !signature) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return NextResponse.json({ error: "Supabase service access is not configured." }, { status: 503 });

  const { error: insertError } = await supabase.from("stripe_events").insert({
    event_id: event.id,
    event_type: event.type,
    processing_state: "processing",
  });
  if (insertError?.code === "23505") return NextResponse.json({ received: true, duplicate: true });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  try {
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted" ||
      event.type === "customer.subscription.paused" ||
      event.type === "customer.subscription.resumed"
    ) {
      await syncSubscription(event.data.object);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const planCode = session.metadata?.plan;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (userId && planCode) {
        await supabase.from("subscriptions").upsert({
          user_id: userId,
          plan_code: planCode,
          stripe_customer_id: customerId ?? null,
          stripe_subscription_id: subscriptionId ?? null,
          status: "active",
        });
      }
    }

    await supabase
      .from("stripe_events")
      .update({ processing_state: "processed", processed_at: new Date().toISOString() })
      .eq("event_id", event.id);
  } catch (error) {
    await supabase
      .from("stripe_events")
      .update({
        processing_state: "failed",
        error_message: error instanceof Error ? error.message : "Unknown webhook error",
      })
      .eq("event_id", event.id);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
