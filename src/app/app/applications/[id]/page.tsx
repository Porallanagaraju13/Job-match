import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, CircleDot } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { applicationStatus } from "@/features/applications/application-status";
import { ApplicationReviewPanel } from "@/features/applications/components/application-review-panel";


import { getApplicationById } from "@/server/applications/repository";
import { getProfileDraftForCurrentUser } from "@/server/profile/repository";
import { cn } from "@/lib/utils";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [application, profile] = await Promise.all([
    getApplicationById(id),
    getProfileDraftForCurrentUser(),
  ]);
  if (!application) return notFound();
  const status = applicationStatus[application.state];
  const steps = [
    { label: "Job verified", done: true },
    { label: "Form scanned", done: true },
    {
      label: application.state === "needs_input" ? "Missing information" : "Answers mapped",
      done: application.state !== "needs_input",
      active: application.state === "needs_input",
    },
    {
      label: "Review",
      done: application.state === "submitted",
      active: application.state === "ready_for_review",
    },
    { label: "Submitted", done: application.state === "submitted" },
  ];

  return (
    <div className="space-y-7">
      <Button render={<Link href="/app/applications" />} variant="ghost" className="-ml-2 w-fit">
        <ArrowLeft className="size-4" />
        Back to applications
      </Button>
      <PageHeader
        eyebrow={`${application.source} application`}
        title={application.role}
        description={`${application.company} · Updated ${application.updatedLabel}`}
        actions={<Badge className={cn("border-0 px-3 py-1.5", status.className)}>{status.label}</Badge>}
      />

      <Card className="p-5">
        <div className="grid gap-3 sm:grid-cols-5">
          {steps.map((step, index) => (
            <div key={step.label} className="relative flex items-center gap-2 sm:flex-col sm:text-center">
              {index < steps.length - 1 && (
                <span className="absolute left-4 top-4 hidden h-px w-[calc(100%-1rem)] bg-border sm:block" />
              )}
              <span className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full bg-card">
                {step.done ? (
                  <CheckCircle2 className="size-5 text-emerald-600" />
                ) : step.active ? (
                  <CircleDot className="size-5 text-primary" />
                ) : (
                  <Circle className="size-5 text-muted-foreground/50" />
                )}
              </span>
              <span className={cn("text-xs font-medium", step.active ? "text-primary" : "text-muted-foreground")}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <ApplicationReviewPanel application={application} profile={profile} />
    </div>
  );
}
