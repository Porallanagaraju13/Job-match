import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { PricingGrid } from "@/components/billing/pricing-grid";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple plans for a more focused job search.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/">
            <BrandMark />
          </Link>
          <Button render={<Link href="/" />} variant="ghost">
            <ArrowLeft className="size-4" />
            Back home
          </Button>
        </div>
      </header>
      <main>
        <section className="surface-grid border-b">
          <div className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-8">
            <Badge variant="secondary" className="rounded-md text-primary">
              Pricing that follows real usage
            </Badge>
            <h1 className="text-balance mt-6 font-heading text-5xl font-semibold tracking-[-0.045em] sm:text-6xl">
              Start focused. Scale when the search gets serious.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Every plan keeps you in control. Paid plans add more assisted applications and faster
              processing—never hidden submissions.
            </p>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <PricingGrid />
          <div className="mx-auto mt-10 flex max-w-2xl items-start gap-3 rounded-lg border bg-card p-5 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <p>
              Assisted-application allowances reserve capacity for browser and AI processing. Credits
              are returned when JobMatch cannot complete a run for a system reason.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
