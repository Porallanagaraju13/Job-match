"use client";

import { BookmarkX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { JobCard } from "@/features/jobs/components/job-card";
import { useSavedJobs } from "@/features/jobs/use-saved-jobs";
import type { Job } from "@/lib/types";

export function SavedJobsList({ jobs }: { jobs: Job[] }) {
  const { savedJobIds } = useSavedJobs();
  const savedJobs = jobs.filter((job) => savedJobIds.includes(job.id));

  if (savedJobs.length === 0) {
    return (
      <Card className="py-20 text-center">
        <BookmarkX className="mx-auto size-9 text-muted-foreground" />
        <p className="mt-4 font-heading text-xl font-bold">Your shortlist is empty</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Save promising roles from your match feed. They will stay here even if the opening closes.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {savedJobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
