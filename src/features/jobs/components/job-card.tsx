"use client";

import Link from "next/link";
import {
  Bookmark,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSavedJobs } from "@/features/jobs/use-saved-jobs";
import type { Job } from "@/lib/types";
import { cn } from "@/lib/utils";

export function JobCard({ job, compact = false }: { job: Job; compact?: boolean }) {
  const { isSaved, toggleSaved } = useSavedJobs();
  const saved = isSaved(job.id);

  return (
    <Card className="p-5 transition-colors hover:border-slate-300">
      <div className="flex items-start gap-4">
        <span
          className={`grid size-12 shrink-0 place-items-center rounded-lg ${job.companyColor} font-heading text-lg font-semibold text-white`}
        >
          {job.companyInitial}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/app/jobs/${job.id}`} className="font-heading text-lg font-semibold hover:text-primary">
                  {job.title}
                </Link>
                <Badge variant="outline" className="text-[10px]">
                  {job.source}
                </Badge>
              </div>
              <p className="mt-1 font-medium text-muted-foreground">{job.company}</p>
            </div>
            <div className="min-w-28">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-muted-foreground">Profile match</span>
                <span className="font-heading text-xl font-semibold text-emerald-700">{job.matchScore}%</span>
              </div>
              <Progress value={job.matchScore} className="mt-1.5 h-1.5" />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {job.location}
            </span>
            <span className="flex items-center gap-1.5">
              <BriefcaseBusiness className="size-3.5" />
              {job.workMode} · {job.employmentType}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock3 className="size-3.5" />
              Posted {job.postedLabel}
            </span>
          </div>

          {!compact && (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                {job.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="font-normal">
                    {tag}
                  </Badge>
                ))}
                <Badge variant="secondary" className="font-normal">
                  {job.seniority}
                </Badge>
              </div>
              <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">{job.description}</p>
              <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="size-3.5" />
                {job.matchReasons[0]}
              </p>
            </>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="font-semibold">{job.salary}</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => toggleSaved(job.id)}
                aria-pressed={saved}
                className={cn(saved && "border-primary bg-secondary text-primary")}
              >
                <Bookmark className={cn("size-4", saved && "fill-current")} />
                {saved ? "Saved" : "Save"}
              </Button>
              <Button render={<Link href={`/app/jobs/${job.id}`} />}>
                View & apply
                <ExternalLink className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
