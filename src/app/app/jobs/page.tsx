import Link from "next/link";
import { BarChart3, BriefcaseBusiness } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { JobsExplorer } from "@/features/jobs/components/jobs-explorer";
import { getAppContext } from "@/server/app-context";
import { getJobsForCurrentUser } from "@/server/jobs/repository";
import { SyncJobsButton } from "./sync-jobs-button";

export default async function JobsPage() {
  const [jobs, context] = await Promise.all([getJobsForCurrentUser(), getAppContext()]);
  const firstName = context.profile.fullName.trim().split(/\s+/)[0] || "there";

  return (
    <div className="space-y-8">
      <Card className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            <BriefcaseBusiness className="size-4" />
            Job search overview
          </p>
          <h1 className="mt-3 font-heading text-2xl font-semibold tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Showing 1–{Math.min(6, jobs.length)} of {jobs.length} matched jobs.
          </p>
        </div>
        <Button render={<Link href="/app/applications" />} variant="outline">
          <BarChart3 className="size-4" />
          View Analytics
        </Button>
      </Card>

      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-3xl font-semibold tracking-tight">Jobs</h2>
            <p className="mt-1 text-base text-muted-foreground">
              Review opportunities from your selected job platforms.
            </p>
          </div>
          <SyncJobsButton />
        </div>
      </section>

      <JobsExplorer jobs={jobs} profile={context.profile} hasResume={context.hasResume} />
    </div>
  );
}
