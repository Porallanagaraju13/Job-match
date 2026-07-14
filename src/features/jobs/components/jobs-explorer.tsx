"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bookmark,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  LoaderCircle,
  MapPin,
  Search,
  SlidersHorizontal,
  ThumbsDown,
  ThumbsUp,
  EyeOff,
  Wifi,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useSavedJobs } from "@/features/jobs/use-saved-jobs";
import type { Job, JobSource, ProfileDraft } from "@/lib/types";
import { cn } from "@/lib/utils";

const platformDetails: Array<{ source: string; label?: string; mark: string; description: string }> = [
  { source: "LinkedIn", mark: "IN", description: "Professional network" },
  { source: "Indeed", mark: "ID", description: "Job search engine" },
  { source: "Naukri", mark: "N", description: "Popular India jobs" },
  { source: "Glassdoor", mark: "G", description: "Company reviews & jobs" },
  { source: "Foundit", mark: "F", description: "Job board" },
  { source: "Instahyre", mark: "I", description: "Tech hiring platform" },
  { source: "Wellfound", mark: "W", description: "Startup jobs" },
  { source: "RemoteOK", mark: "RO", description: "Remote jobs" },
  { source: "Remotive", mark: "R", description: "Remote jobs" },
  { source: "Arbeitnow", mark: "AN", description: "International jobs" },
  { source: "Greenhouse", label: "Company Careers", mark: "GH", description: "Company career pages" },
  { source: "Lever", label: "Company Careers", mark: "LV", description: "Company career pages" },
  { source: "Career Page", label: "Company Careers", mark: "CP", description: "Direct openings" },
  { source: "IIMJobs", mark: "IIM", description: "Management jobs" },
  { source: "Hirist", mark: "H", description: "Tech jobs" },
];

function readableSource(source: string) {
  if (!source || source === "undefined" || source === "null" || source === "Unknown") {
    return "Company Careers";
  }
  return source;
}

function sourceMark(source: string) {
  const readable = readableSource(source);
  const letters = source
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((part) => part[0])
    .join("");
  return (letters || readable).slice(0, 3).toUpperCase();
}

function profileScore(profile: ProfileDraft, hasResume: boolean) {
  const checks = [
    Boolean(profile.fullName && profile.email && profile.phone && profile.location),
    Boolean(profile.summary),
    Boolean(profile.headline),
    Boolean(profile.education.length > 0),
    profile.skills.length > 0,
    hasResume,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function JobsExplorer({
  jobs,
  profile,
  hasResume,
}: {
  jobs: Job[];
  profile: ProfileDraft;
  hasResume: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSaved, toggleSaved } = useSavedJobs();
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<JobSource[]>([]);
  const [workMode, setWorkMode] = useState("All");
  const [minimumMatch, setMinimumMatch] = useState(0);
  const [sortBy, setSortBy] = useState<"relevance" | "newest">("relevance");
  const [dismissedJobs, setDismissedJobs] = useState<Set<string>>(() => new Set());
  const [feedbackByJob, setFeedbackByJob] = useState<Record<string, Job["feedback"]>>(() =>
    Object.fromEntries(jobs.map((job) => [job.id, job.feedback])),
  );
  const [feedbackError, setFeedbackError] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [starting, setStarting] = useState(false);
  const completeness = profileScore(profile, hasResume);
  const availablePlatforms = useMemo(() => {
    const details = new Map(platformDetails.map((platform) => [platform.source, platform]));
    for (const job of jobs) {
      if (!details.has(job.source)) {
        details.set(job.source, {
          source: job.source,
          label: readableSource(job.source),
          mark: sourceMark(job.source),
          description: "Live job source",
        });
      }
    }
    return Array.from(details.values());
  }, [jobs]);
  const activeSources = useMemo(
    () => (sources.length ? sources : availablePlatforms.map((item) => item.source)),
    [availablePlatforms, sources],
  );

  const visibleJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return jobs
      .filter((job) => !dismissedJobs.has(job.id))
      .filter((job) => activeSources.includes(job.source))
      .filter((job) => workMode === "All" || job.workMode === workMode)
      .filter((job) => job.matchScore >= minimumMatch)
      .filter(
        (job) =>
          !normalizedQuery ||
          [job.title, job.company, job.location, ...job.tags]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery),
      )
      .sort((a, b) => {
        if (sortBy === "relevance") return b.matchScore - a.matchScore;
        const timeDiff = new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
        if (timeDiff !== 0) return timeDiff;
        return b.matchScore - a.matchScore;
      });
  }, [jobs, query, activeSources, workMode, minimumMatch, sortBy, dismissedJobs]);

  function toggleSource(source: JobSource) {
    const currentSources = sources.length ? sources : availablePlatforms.map((item) => item.source);
    setSources(
      currentSources.includes(source)
        ? currentSources.filter((item) => item !== source)
        : [...currentSources, source],
    );
  }

  function applyManually() {
    if (!selectedJob) return;
    if (!selectedJob.applyUrl) {
      console.warn('No apply URL available for job:', selectedJob);
      return;
    }
    try {
      // Ensure URL has a protocol for window.open
      const url = selectedJob.applyUrl.startsWith('http')
        ? selectedJob.applyUrl
        : `https://${selectedJob.applyUrl}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error('Failed to open application URL:', err);
    }
    setSelectedJob(null);
  }

  async function sendFeedback(job: Job, feedback: "relevant" | "not_relevant" | "hidden") {
    const previous = feedbackByJob[job.id];
    setFeedbackByJob((current) => ({ ...current, [job.id]: feedback }));
    setFeedbackError("");
    if (feedback !== "relevant") {
      setDismissedJobs((current) => new Set([...current, job.id]));
    }

    const response = await fetch("/api/jobs/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId: job.id, feedback }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setFeedbackError(payload?.error ?? "Job feedback requires the pending database migration.");
      setFeedbackByJob((current) => ({ ...current, [job.id]: previous }));
      setDismissedJobs((current) => {
        const next = new Set(current);
        next.delete(job.id);
        return next;
      });
    }
  }

  async function applyAutomatically() {
    if (!selectedJob) return;
    setStarting(true);
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId: selectedJob.id }),
    });
    const payload = (await response.json().catch(() => null)) as { id?: string } | null;
    setStarting(false);
    setSelectedJob(null);
    const parameters = new URLSearchParams({
      started: payload?.id ?? "app_preview",
      role: selectedJob.title,
      company: selectedJob.company,
      source: selectedJob.source,
    });
    if (searchParams.get("demo") === "1") {
      parameters.set("demo", "1");
    }
    router.push(`/app/applications?${parameters.toString()}`);
    router.refresh();
  }

  return (
    <>
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-7">
          <section>
            <h3 className="font-heading text-xl font-semibold">Job Platforms</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {availablePlatforms.map((platform) => {
                const active = activeSources.includes(platform.source);
                return (
                  <button
                    key={platform.source}
                    type="button"
                    onClick={() => toggleSource(platform.source)}
                    className={cn(
                      "relative flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-4 text-left transition-colors duration-200",
                      active
                        ? "border-emerald-300 bg-emerald-50/70"
                        : "border-border text-muted-foreground hover:border-slate-300 hover:bg-slate-50 hover:text-foreground",
                    )}
                  >
                    {active && (
                      <span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full border border-emerald-200 bg-white text-emerald-700">
                        <Check className="size-4" strokeWidth={3} />
                      </span>
                    )}
                    <span className="grid size-11 place-items-center rounded-md border bg-white font-black text-emerald-700">
                      {platform.mark}
                    </span>
                    <span>
                      <span className="block font-semibold">{platform.label ?? readableSource(platform.source)}</span>
                      <span className="block text-xs text-muted-foreground">{platform.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h3 className="font-heading text-xl font-semibold">Top Job Matches</h3>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search-jobs"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="h-11 bg-white pl-9"
                    placeholder="Search jobs..."
                  />
                </div>
                <label className="relative">
                  <span className="sr-only">Work mode</span>
                  <select
                    value={workMode}
                    onChange={(event) => setWorkMode(event.target.value)}
                    className="h-11 rounded-md border bg-white px-3 text-sm"
                  >
                    <option>All</option>
                    <option>Remote</option>
                    <option>Hybrid</option>
                    <option>On-site</option>
                  </select>
                </label>
                <label className="relative">
                  <span className="sr-only">Minimum match</span>
                  <select
                    value={minimumMatch}
                    onChange={(event) => setMinimumMatch(Number(event.target.value))}
                    className="h-11 rounded-md border bg-white px-3 text-sm"
                  >
                    <option value={0}>Any match</option>
                    <option value={70}>70%+</option>
                    <option value={80}>80%+</option>
                    <option value={90}>90%+</option>
                  </select>
                </label>
                <Button
                  variant="outline"
                  className="h-11 bg-white"
                  onClick={() => setSortBy((current) => (current === "relevance" ? "newest" : "relevance"))}
                >
                  <SlidersHorizontal className="size-4" />
                  {sortBy === "relevance" ? "Best match" : "Newest"}
                </Button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {feedbackError && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {feedbackError}
                </p>
              )}
              {visibleJobs.map((job) => {
                const saved = isSaved(job.id);
                return (
                  <Card key={job.id} className="p-5 transition-colors hover:border-slate-300">
                    <div className="grid gap-5 lg:grid-cols-[64px_minmax(0,1fr)_190px_150px] lg:items-center">
                      <span className="grid size-14 place-items-center rounded-lg border bg-slate-50 text-lg font-semibold text-slate-700">
                        {job.companyInitial}
                      </span>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/app/jobs/${job.id}`}
                            className="font-heading text-lg font-semibold hover:text-emerald-700"
                          >
                            {job.title}
                          </Link>
                          <Badge variant="outline" className="gap-1 rounded-md text-[10px]">
                            {job.source}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{job.company}</p>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {job.workMode === "Remote" ? (
                              <Wifi className="size-3.5" />
                            ) : (
                              <MapPin className="size-3.5" />
                            )}
                            {job.workMode}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3.5" />
                            {job.location}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-emerald-700">{job.matchScore}% Match</span>
                        </div>
                        <Progress value={job.matchScore} className="mt-2 h-1.5" />
                        <p className="mt-2 text-xs font-medium text-emerald-700">
                          {job.matchScore >= 90 ? "High fit" : "Good fit"}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock3 className="size-3" />
                          Posted {job.postedLabel}
                        </p>
                        {job.lastVerifiedAt && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Verified {new Date(job.lastVerifiedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <div className="grid gap-2">
                        <Button className="font-semibold" onClick={() => setSelectedJob(job)}>
                          Apply Now
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => toggleSaved(job.id)}
                          aria-pressed={saved}
                        >
                          <Bookmark className={cn("size-4", saved && "fill-current")} />
                          {saved ? "Saved" : "Save"}
                        </Button>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Mark ${job.title} relevant`}
                            aria-pressed={feedbackByJob[job.id] === "relevant"}
                            className={cn(feedbackByJob[job.id] === "relevant" && "text-emerald-700")}
                            onClick={() => void sendFeedback(job, "relevant")}
                          >
                            <ThumbsUp className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Mark ${job.title} not relevant`}
                            onClick={() => void sendFeedback(job, "not_relevant")}
                          >
                            <ThumbsDown className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Hide ${job.title}`}
                            onClick={() => void sendFeedback(job, "hidden")}
                          >
                            <EyeOff className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {visibleJobs.length === 0 && (
                <Card className="py-16 text-center">
                  <Search className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-4 font-heading text-lg font-bold">No matching jobs</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Select another platform or clear the search.
                  </p>
                </Card>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <Card className="p-6">
            <h3 className="font-heading text-xl font-semibold">Profile Completeness</h3>
            <div className="mt-6 flex items-center gap-5">
              <div
                className="grid size-28 shrink-0 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#059669 ${completeness * 3.6}deg, #e2e8f0 0deg)`,
                }}
              >
                <div className="grid size-20 place-items-center rounded-full bg-white text-center">
                  <span>
                    <span className="block text-2xl font-semibold text-emerald-700">
                      {completeness}%
                    </span>
                    <span className="block text-[10px] text-muted-foreground">Complete</span>
                  </span>
                </div>
              </div>
              <div>
                <p className="font-bold">
                  {completeness === 100 ? "Profile complete" : "Complete your profile"}
                </p>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">
                  {completeness === 100
                    ? "Your profile is complete and ready for applications."
                    : "Add the remaining details for stronger applications."}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3 border-t pt-5 text-sm">
              {[
                ["Basic Information", Boolean(profile.fullName && profile.email && profile.phone && profile.location)],
                ["Summary", Boolean(profile.summary)],
                ["Work Experience", Boolean(profile.headline)],
                ["Education", Boolean(profile.education.length > 0)],
                ["Skills", profile.skills.length > 0],
                ["Resume", hasResume],
              ].map(([label, done]) => (
                <div key={String(label)} className="flex items-center gap-2">
                  <CheckCircle2
                    className={cn("size-4", done ? "text-emerald-600" : "text-muted-foreground/35")}
                  />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <Button render={<Link href="/app/profile" />} className="mt-6 w-full font-semibold">
              Improve Profile
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="flex items-center gap-2 font-heading text-lg font-semibold">
              <Clock3 className="size-4" />
              Recent Activity
            </h3>
            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Recently matched
                </p>
                <p className="mt-2 font-semibold">{jobs[0]?.title ?? "Your next role"}</p>
                <p className="text-xs text-muted-foreground">{jobs[0]?.company ?? "JobMatch"}</p>
              </div>
              <div className="border-t pt-4">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <ClipboardCheck className="size-4" />
                  Ready to prepare applications
                </p>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      <Dialog open={Boolean(selectedJob)} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-[590px] rounded-xl p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">How would you like to apply?</DialogTitle>
            <DialogDescription className="text-base leading-6">
              Apply manually in your browser, or prepare this application from your saved profile
              details for {selectedJob?.title}.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 grid gap-3">
            <button
              type="button"
              onClick={applyManually}
              className="flex cursor-pointer items-center gap-4 rounded-xl border bg-white p-5 text-left transition-colors hover:bg-muted/60"
            >
              <ExternalLink className="size-6" />
              <span>
                <span className="block font-bold">Apply Manually</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Open the job application URL in a new tab
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={applyAutomatically}
              disabled={starting}
              className="flex cursor-pointer items-center gap-4 rounded-xl bg-primary p-5 text-left text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
            >
              {starting ? <LoaderCircle className="size-6 animate-spin" /> : <ClipboardCheck className="size-6" />}
              <span>
                <span className="block font-semibold">Apply with AI</span>
                <span className="mt-1 block text-sm opacity-70">
                  Auto-fill and submit using your profile & resume
                </span>
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
