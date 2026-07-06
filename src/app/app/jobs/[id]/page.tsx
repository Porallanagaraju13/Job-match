import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Gauge,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StartApplicationButton } from "@/features/applications/components/start-application-button";
import { getJobById } from "@/server/jobs/repository";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJobById(id);
  if (!job) notFound();

  return (
    <div className="space-y-7">
      <Button render={<Link href="/app/jobs" />} variant="ghost" className="-ml-2 w-fit">
        <ArrowLeft className="size-4" />
        Back to matches
      </Button>
      <PageHeader
        eyebrow={`${job.source} · Verified ${job.postedLabel}`}
        title={job.title}
        description={`${job.company} · ${job.location}`}
        actions={
          <>
            <Button variant="outline" className="rounded-full">
              <Bookmark className="size-4" />
              Save
            </Button>
            <StartApplicationButton jobId={job.id} />
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="p-6 shadow-sm">
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Building2 className="size-4" />
                {job.company}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="size-4" />
                {job.location}
              </span>
              <span className="flex items-center gap-2">
                <BriefcaseBusiness className="size-4" />
                {job.workMode} · {job.employmentType}
              </span>
              <span className="flex items-center gap-2">
                <Clock3 className="size-4" />
                Posted {job.postedLabel}
              </span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {job.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
              <Badge variant="secondary">{job.seniority}</Badge>
            </div>
            <div className="mt-8">
              <h2 className="font-heading text-xl font-bold">About the role</h2>
              <p className="mt-4 leading-8 text-muted-foreground">{job.description}</p>
              <p className="mt-4 leading-8 text-muted-foreground">
                You will partner across product, design, engineering, and go-to-market teams. The
                strongest candidates bring structured thinking, strong written communication, and a
                track record of moving from customer insight to measurable product outcomes.
              </p>
            </div>
            <div className="mt-8">
              <h2 className="font-heading text-xl font-bold">What you will do</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                {[
                  "Set a clear product direction and turn it into an outcome-focused roadmap.",
                  "Work closely with design and engineering from discovery through launch.",
                  "Use qualitative and quantitative signals to prioritize the highest-value problems.",
                  "Communicate decisions and tradeoffs clearly across the organization.",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
          <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Prefer the company’s own application?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Open the canonical posting and track it manually in JobMatch.
              </p>
            </div>
            <Button
              render={<a href={job.applyUrl} target="_blank" rel="noreferrer" />}
              variant="outline"
              className="rounded-full"
            >
              Open original
              <ExternalLink className="size-4" />
            </Button>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Gauge className="size-4 text-primary" />
                Profile match
              </span>
              <span className="font-heading text-2xl font-semibold text-emerald-700">{job.matchScore}%</span>
            </div>
            <Progress value={job.matchScore} className="mt-4 h-2" />
            <div className="mt-5 space-y-3">
              {job.matchReasons.map((reason) => (
                <p key={reason} className="flex gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  {reason}
                </p>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-semibold text-muted-foreground">Estimated compensation</p>
            <p className="mt-2 font-heading text-2xl font-semibold">{job.salary}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Provided by the source where available. Verify the range on the company posting.
            </p>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
            <ShieldCheck className="size-5 text-emerald-700" />
            <p className="mt-3 font-semibold">Review before submit</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              JobMatch scans required fields, pauses for anything missing, and shows every answer
              before submitting.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
