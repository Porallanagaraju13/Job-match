import { ClipboardCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ApplicationList } from "@/features/applications/components/application-list";
import { getApplicationsForCurrentUser } from "@/server/applications/repository";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    started?: string;
    role?: string;
    company?: string;
    source?: string;
  }>;
}) {
  const parameters = await searchParams;
  const applications = await getApplicationsForCurrentUser();
  const hasStartedApplication =
    parameters.started && applications.some((application) => application.id === parameters.started);

  if (parameters.started && !hasStartedApplication) {
    applications.unshift({
      id: parameters.started,
      jobId: "job-1",
      company: parameters.company || "Smart Working Solutions",
      role: parameters.role || "Senior Software Engineer",
      state: "draft",
      updatedLabel: "Just now",
      source: sourceName(parameters.source),
      nextAction: "Waiting to start field detection",
    });
  }

  return (
    <div className="space-y-8">
      <Card className="p-6 shadow-none">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
          <ClipboardCheck className="size-4" />
          Application tracker
        </p>
        <h1 className="mt-3 font-heading text-2xl font-semibold">Application status</h1>
        <p className="mt-1 text-muted-foreground">
          Track prepared applications, missing profile fields, and submission progress across all
          your jobs.
        </p>
      </Card>
      <div>
        <h2 className="font-heading text-4xl font-semibold tracking-tight">Your applications</h2>
        <p className="mt-1 text-lg text-muted-foreground">
          Review queued, in-progress, submitted, and failed applications in one place.
        </p>
      </div>
      <ApplicationList applications={applications} startedId={parameters.started} />
    </div>
  );
}

function sourceName(value: string | undefined): string {
  if (!value || value === "undefined" || value === "null" || value === "Unknown") {
    return "Company Careers";
  }
  return value;
}
