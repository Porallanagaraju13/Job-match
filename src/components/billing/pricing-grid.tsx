"use client";

import { useState } from "react";
import { BadgeCheck, Check, LoaderCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { plans } from "@/config/plans";
import { cn } from "@/lib/utils";

export function PricingGrid() {
  const [loading, setLoading] = useState<string | null>(null);

  async function startCheckout(planCode: string) {
    if (planCode === "free") {
      window.location.assign("/sign-up");
      return;
    }

    setLoading(planCode);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: planCode }),
      });
      const payload = (await response.json()) as { url?: string; demoUrl?: string };
      window.location.assign(payload.url ?? payload.demoUrl ?? "/app/billing?checkout=demo");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {plans.map((plan) => (
        <Card
          key={plan.code}
          className={cn(
            "card-lift relative flex flex-col overflow-hidden p-7",
            plan.featured
              ? "ring-2 ring-emerald-500/30 shadow-[0_0_0_1px_rgba(16,185,129,0.2),0_8px_32px_rgba(16,185,129,0.08)]"
              : "shadow-sm",
          )}
        >
          {/* Featured plan: emerald top-border stripe */}
          {plan.featured && (
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500"
            />
          )}

          {plan.badge && (
            <Badge
              className={cn(
                "absolute right-5 top-5 rounded-md",
                plan.featured ? "bg-primary text-primary-foreground" : "bg-secondary text-primary",
              )}
            >
              {plan.featured && <BadgeCheck className="size-3" aria-hidden="true" />}
              {plan.badge}
            </Badge>
          )}

          <p className="font-heading text-xl font-bold">{plan.name}</p>
          <p className="mt-3 min-h-12 text-sm leading-6 text-muted-foreground">{plan.description}</p>

          <div className="mt-7 flex items-end gap-1">
            <span className="tabular-nums font-heading text-5xl font-semibold tracking-[-0.04em]">
              ${plan.monthlyPrice}
            </span>
            <span className="mb-1.5 text-sm text-muted-foreground">/ month</span>
          </div>

          <div className="mt-7 space-y-3 border-y py-5 text-sm">
            <p className="font-medium">{plan.jobResults}</p>
            <p className="font-medium">{plan.assistedApplications}</p>
          </div>

          <ul className="mt-6 flex-1 space-y-3">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-emerald-600"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
                {feature}
              </li>
            ))}
          </ul>

          <Button
            size="lg"
            variant={plan.featured ? "default" : "outline"}
            className="mt-8 w-full"
            onClick={() => startCheckout(plan.code)}
            disabled={loading !== null}
            aria-label={plan.code === "free" ? "Start free plan" : `Choose ${plan.name} plan`}
          >
            {loading === plan.code && (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            )}
            {plan.code === "free" ? "Start free" : `Choose ${plan.name}`}
          </Button>
        </Card>
      ))}
    </div>
  );
}
