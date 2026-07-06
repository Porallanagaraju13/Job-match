import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  BriefcaseBusiness,
  Check,
  FileSearch,
  Gauge,
  LockKeyhole,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const steps = [
  {
    number: "01",
    title: "Create a structured profile",
    description: "Upload your resume, review extracted details, and keep your profile ready.",
    icon: FileSearch,
  },
  {
    number: "02",
    title: "Review relevant roles",
    description: "See jobs from selected platforms with fit scores and clear context.",
    icon: BriefcaseBusiness,
  },
  {
    number: "03",
    title: "Track every application",
    description: "Save jobs, prepare applications, and follow status from one workspace.",
    icon: MousePointerClick,
  },
];

const features = [
  {
    title: "Focused job feed",
    description: "Naukri, Instahyre, IIMJobs, Hirist, Foundit, and Wellfound in one place.",
    icon: BriefcaseBusiness,
    color: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  {
    title: "Saved jobs",
    description: "Keep a shortlist of opportunities and return when you are ready.",
    icon: Bookmark,
    color: "bg-sky-50 text-sky-700 ring-sky-100",
  },
  {
    title: "Application tracking",
    description: "Know what is missing, in progress, ready for review, or submitted.",
    icon: Gauge,
    color: "bg-violet-50 text-violet-700 ring-violet-100",
  },
  {
    title: "Review before submit",
    description: "You stay in control of profile details and final application answers.",
    icon: ShieldCheck,
    color: "bg-amber-50 text-amber-700 ring-amber-100",
  },
];

// Platform dots for the hero card
const platformColors: Record<string, string> = {
  Naukri: "bg-orange-400",
  Instahyre: "bg-violet-400",
  IIMJobs: "bg-blue-400",
};

const heroJobs = [
  { role: "Senior Frontend Engineer", source: "Naukri", score: "96%" },
  { role: "Product Designer", source: "Instahyre", score: "92%" },
  { role: "AI Infrastructure Engineer", source: "IIMJobs", score: "89%" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main id="main-content">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b hero-gradient surface-grid">
          {/* Gradient noise overlay for depth */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/60"
          />

          <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-32">
            {/* Left: copy */}
            <div className="fade-up">
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Job search management
              </p>

              <h1 className="mt-6 max-w-3xl font-heading text-4xl font-semibold leading-[1.12] tracking-[-0.04em] text-slate-950 text-balance sm:text-5xl lg:text-6xl">
                A calmer way to manage{" "}
                <span className="text-gradient">job applications.</span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                JobMatch helps you organize your profile, discover relevant roles, save jobs,
                and track applications — without turning your job search into a spreadsheet.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button render={<Link href="/sign-up" />} size="lg" className="h-12 gap-2 px-6">
                  Create account
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  render={<Link href="/app/jobs" />}
                  size="lg"
                  variant="outline"
                  className="h-12 px-6"
                >
                  View dashboard
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                {["No credit card required", "Private resume storage", "Review before submit"].map(
                  (item) => (
                    <span key={item} className="flex items-center gap-1.5">
                      <Check className="size-4 text-emerald-600" aria-hidden="true" />
                      {item}
                    </span>
                  ),
                )}
              </div>
            </div>

            {/* Right: animated hero card */}
            <div className="fade-up fade-up-delay-2">
              <div className="glass-card relative overflow-hidden rounded-2xl">
                {/* Scan-line animation */}
                <div
                  aria-hidden="true"
                  className="scan-line pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-2xl"
                />

                {/* Card header */}
                <div className="flex items-start justify-between border-b px-6 py-5">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Today</p>
                    <h2 className="mt-1 font-heading text-xl font-semibold text-slate-950">
                      Application workspace
                    </h2>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    <span
                      aria-hidden="true"
                      className="pulse-dot relative size-1.5 rounded-full bg-emerald-500"
                    />
                    Active
                  </span>
                </div>

                {/* Job rows */}
                <div className="grid gap-2.5 p-4">
                  {heroJobs.map(({ role, source, score }) => (
                    <div
                      key={role}
                      className="flex items-center justify-between gap-4 rounded-xl border bg-white/70 px-4 py-3.5 backdrop-blur-sm transition-colors duration-150 hover:bg-white"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-950">{role}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span
                            aria-hidden="true"
                            className={`size-1.5 rounded-full ${platformColors[source] ?? "bg-slate-400"}`}
                          />
                          {source}
                        </p>
                      </div>
                      <span className="tabular-nums shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                        {score} fit
                      </span>
                    </div>
                  ))}
                </div>

                {/* Card footer hint */}
                <div className="border-t bg-slate-50/50 px-6 py-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    3 new matches today · Updated just now
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────── */}
        <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
              How it works
            </p>
            <h2 className="mt-3 text-balance font-heading text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Simple workflow, clear status.
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              The product keeps repetitive job-search work organized while leaving final decisions
              with you.
            </p>
          </div>

          <div className="relative mt-12 grid gap-5 lg:grid-cols-3">
            {/* Connector line (desktop only) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-[2.25rem] left-[calc(33.33%+1rem)] right-[calc(33.33%+1rem)] hidden h-px bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-200 lg:block"
            />

            {steps.map((step) => (
              <Card
                key={step.number}
                className="card-lift relative p-6 transition-shadow"
              >
                <div className="flex items-center justify-between">
                  {/* Numbered badge */}
                  <span className="flex size-8 items-center justify-center rounded-full bg-emerald-50 font-mono text-xs font-bold text-emerald-600 ring-1 ring-emerald-200">
                    {step.number}
                  </span>
                  {/* Icon well */}
                  <span className="grid size-10 place-items-center rounded-xl bg-slate-50 text-emerald-700 ring-1 ring-slate-200">
                    <step.icon className="size-5" aria-hidden="true" />
                  </span>
                </div>
                <h3 className="mt-6 font-heading text-base font-semibold text-slate-950">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────── */}
        <section id="features" className="border-y bg-white py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div className="lg:sticky lg:top-24">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
                Product details
              </p>
              <h2 className="mt-3 text-balance font-heading text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Built for practical job search work.
              </h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                A professional dashboard for jobs, saved roles, resume data, profile quality, and
                application status.
              </p>
              <Button render={<Link href="/sign-up" />} variant="outline" className="mt-7 gap-2">
                Start setup
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  className="card-lift p-5 transition-shadow"
                >
                  {/* Color-tinted icon well */}
                  <span
                    className={`grid size-10 place-items-center rounded-xl ring-1 ${feature.color}`}
                  >
                    <feature.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-heading text-base font-semibold text-slate-950">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── Trust / Privacy ───────────────────────────────── */}
        <section id="trust" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <Card className="relative overflow-hidden bg-slate-950 p-8 text-white sm:p-10 lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10">
            {/* Subtle geometric overlay */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-[0.04]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 32px)",
              }}
            />

            <div className="relative max-w-2xl">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-400">
                <LockKeyhole className="size-4" aria-hidden="true" />
                Privacy and control
              </p>
              <h2 className="mt-5 text-balance font-heading text-3xl font-semibold tracking-tight">
                Your career data stays yours.
              </h2>
              <p className="mt-4 leading-7 text-slate-300">
                Resume files remain private, profile data is user-scoped, and applications are
                prepared for review before final submission.
              </p>
            </div>

            <div className="relative mt-8 grid gap-2.5 lg:mt-0">
              {[
                "Private document storage",
                "User-scoped access",
                "Final review before submit",
              ].map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 backdrop-blur-sm"
                >
                  <Check className="size-4 shrink-0 text-emerald-400" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>
          </Card>
        </section>

        {/* ── Final CTA ────────────────────────────────────── */}
        <section className="border-t">
          <div
            className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-8"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(16,185,129,0.08) 0%, transparent 70%)",
            }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Free to start
            </span>
            <h2 className="mt-6 text-balance font-heading text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Ready to organize your job search?
            </h2>
            <p className="mx-auto mt-4 max-w-xl leading-7 text-muted-foreground">
              Start with your resume, then review jobs and applications from a single workspace.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button
                render={<Link href="/sign-up" />}
                size="lg"
                className="h-12 gap-2 px-7 glow-emerald"
              >
                Create free account
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <Button
                render={<Link href="/app/jobs" />}
                size="lg"
                variant="ghost"
                className="h-12 px-6 text-muted-foreground"
              >
                See the dashboard →
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

