import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  Download,
  Gauge,
  ReceiptText,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { BillingPortalButton } from "@/components/billing/billing-portal-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function BillingPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Plan & usage"
        title="Billing and credits"
        description="Manage your subscription, see usage, and understand what each assisted application consumes."
        actions={
          <Button render={<Link href="/pricing" />} variant="outline">
            Compare plans
            <ArrowRight className="size-4" />
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card className="overflow-hidden p-0">
            <div className="bg-slate-950 p-6 text-white">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Badge className="border-0 bg-emerald-400/15 text-emerald-100">
                    <BadgeCheck className="size-3" />
                    Current plan
                  </Badge>
                  <h2 className="mt-4 font-heading text-3xl font-semibold">JobMatch Pro</h2>
                  <p className="mt-2 text-sm text-white/60">Renews August 3, 2026 · $19/month</p>
                </div>
                <BillingPortalButton />
              </div>
            </div>
            <div className="grid gap-5 p-6 sm:grid-cols-2">
              <div className="rounded-lg border p-5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Gauge className="size-4 text-primary" />
                    Assisted applications
                  </span>
                  <span className="font-heading font-bold">12 / 30</span>
                </div>
                <Progress value={40} className="mt-4 h-2" />
                <p className="mt-3 text-xs text-muted-foreground">18 credits remain this billing period.</p>
              </div>
              <div className="rounded-lg border p-5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    Successful submissions
                  </span>
                  <span className="font-heading text-2xl font-semibold">9</span>
                </div>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  Three credits were released because a run needed manual completion.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-xl font-bold">Billing history</h2>
                <p className="mt-1 text-sm text-muted-foreground">Receipts and subscription events.</p>
              </div>
              <ReceiptText className="size-5 text-muted-foreground" />
            </div>
            <div className="mt-5 divide-y">
              {[
                ["July 3, 2026", "JobMatch Pro", "$19.00", "Paid"],
                ["June 3, 2026", "JobMatch Pro", "$19.00", "Paid"],
              ].map(([date, item, amount, status]) => (
                <div key={date} className="grid gap-2 py-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center">
                  <span className="text-sm">{date}</span>
                  <span className="text-sm font-medium">{item}</span>
                  <Badge className="w-fit border-0 bg-emerald-100 text-emerald-800">{status}</Badge>
                  <Button variant="ghost" size="sm">
                    {amount}
                    <Download className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="p-5">
            <CreditCard className="size-5 text-primary" />
            <h2 className="mt-4 font-heading text-lg font-bold">Payment method</h2>
            <p className="mt-3 text-sm font-medium">Visa ending in 4242</p>
            <p className="mt-1 text-xs text-muted-foreground">Expires 08/29</p>
            <Button variant="outline" className="mt-5 w-full rounded-full">
              Update in Stripe
            </Button>
          </Card>
          <Card className="p-5">
            <h2 className="font-heading text-lg font-bold">How credits work</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              One credit is reserved when an assisted application starts. It is consumed after a
              successful submission and released when JobMatch cannot complete the run.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
