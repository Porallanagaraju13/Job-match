"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileText,
  LoaderCircle,
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
import { Label } from "@/components/ui/label";
import type { Application, ApplicationState } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "progress" | "needs_input" | "submitted";

const missingQuestions = [
  "What is your level of spoken and written English?",
  "Are you comfortable working the fixed shift hours with the employer's business hours?",
  "What is your minimum expected salary in USD per year?",
  "Are you open to negotiation?",
];

export function ApplicationList({
  applications,
  startedId,
}: {
  applications: Application[];
  startedId?: string;
}) {
  const [items, setItems] = useState(applications);
  const [filter, setFilter] = useState<Filter>("all");
  const [missingFor, setMissingFor] = useState<Application | null>(null);
  const [autofilling, setAutofilling] = useState(false);
  const [answers, setAnswers] = useState({
    english: "",
    shift: "",
    salary: "",
    negotiation: "",
  });

  useEffect(() => {
    if (!startedId) return;
    const timer = window.setTimeout(() => {
      setItems((current) =>
        current.map((application) =>
          application.id === startedId && application.state === "draft"
            ? {
                ...application,
                state: "needs_input",
                nextAction: "Complete your profile to continue",
              }
            : application,
        ),
      );
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [startedId]);

  const visibleApplications = useMemo(
    () =>
      items.filter((application) => {
        if (filter === "all") return true;
        if (filter === "progress") {
          return application.state === "draft" || application.state === "ready_for_review";
        }
        return application.state === filter;
      }),
    [filter, items],
  );

  const totals = {
    total: items.length,
    progress: items.filter(
      (application) => application.state === "draft" || application.state === "ready_for_review",
    ).length,
    action: items.filter((application) => application.state === "needs_input").length,
    submitted: items.filter((application) => application.state === "submitted").length,
  };

  function autofill() {
    setAutofilling(true);
    window.setTimeout(() => {
      setAnswers({
        english: "Fluent",
        shift: "Yes",
        salary: "120000",
        negotiation: "Yes",
      });
      setAutofilling(false);
    }, 650);
  }

  function saveMissingAnswers() {
    if (!missingFor) return;
    setItems((current) =>
      current.map((application) =>
        application.id === missingFor.id
          ? {
              ...application,
              state: "ready_for_review",
              nextAction: "Review answers and continue application",
            }
          : application,
      ),
    );
    setMissingFor(null);
  }

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Applications", totals.total, "text-foreground"],
          ["In Progress", totals.progress, "text-foreground"],
          ["Needs Action", totals.action, "text-amber-600"],
          ["Submitted", totals.submitted, "text-emerald-600"],
        ].map(([label, value, tone]) => (
          <Card key={String(label)} className="p-6">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={cn("mt-3 text-4xl font-medium", tone)}>{value}</p>
          </Card>
        ))}
      </section>

      <div className="grid grid-cols-4 overflow-hidden rounded-xl border bg-white p-1">
        {[
          ["All", "all", totals.total],
          ["In progress", "progress", totals.progress],
          ["Missing info", "needs_input", totals.action],
          ["Submitted", "submitted", totals.submitted],
        ].map(([label, value, count]) => (
          <button
            key={String(value)}
            type="button"
            onClick={() => setFilter(value as Filter)}
            className={cn(
              "rounded-lg px-3 py-2 text-xs font-semibold sm:text-sm",
              filter === value ? "bg-muted" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label} <span className="ml-1 text-muted-foreground">{count}</span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {visibleApplications.map((application) => (
          <ApplicationCard
            key={application.id}
            application={application}
            onFillMissing={() => setMissingFor(application)}
          />
        ))}
        {visibleApplications.length === 0 && (
          <Card className="p-14 text-center text-muted-foreground">
            No applications in this state yet.
          </Card>
        )}
      </div>

      <Dialog open={Boolean(missingFor)} onOpenChange={(open) => !open && setMissingFor(null)}>
        <DialogContent className="max-h-[86vh] max-w-[680px] overflow-y-auto rounded-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Fill missing application information
            </DialogTitle>
            <DialogDescription className="text-base leading-6">
              Provide the required details for your application to {missingFor?.role}. These answers
              stay editable before submission.
            </DialogDescription>
          </DialogHeader>

          <Button variant="outline" className="mt-2 justify-start" onClick={autofill}>
            {autofilling ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ClipboardCheck className="size-4" />
            )}
            Use profile answers for this application
          </Button>

          <div className="mt-3 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="english-level">{missingQuestions[0]} *</Label>
              <Input
                id="english-level"
                value={answers.english}
                onChange={(event) =>
                  setAnswers((current) => ({ ...current, english: event.target.value }))
                }
                placeholder="e.g. Fluent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-hours">{missingQuestions[1]} *</Label>
              <select
                id="shift-hours"
                value={answers.shift}
                onChange={(event) =>
                  setAnswers((current) => ({ ...current, shift: event.target.value }))
                }
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              >
                <option value="">Select an option</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Discuss">Prefer to discuss</option>
              </select>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expected-salary">{missingQuestions[2]} *</Label>
                <Input
                  id="expected-salary"
                  type="number"
                  value={answers.salary}
                  onChange={(event) =>
                    setAnswers((current) => ({ ...current, salary: event.target.value }))
                  }
                  placeholder="120000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="negotiation">{missingQuestions[3]} *</Label>
                <select
                  id="negotiation"
                  value={answers.negotiation}
                  onChange={(event) =>
                    setAnswers((current) => ({ ...current, negotiation: event.target.value }))
                  }
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                >
                  <option value="">Select an option</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMissingFor(null)}>
              Cancel
            </Button>
            <Button
              onClick={saveMissingAnswers}
              disabled={!answers.english || !answers.shift || !answers.salary || !answers.negotiation}
            >
              Save & Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ApplicationCard({
  application,
  onFillMissing,
}: {
  application: Application;
  onFillMissing: () => void;
}) {
  const status = statusDetails(application.state);
  return (
    <Card
      className={cn(
        "overflow-hidden p-0",
        application.state === "needs_input" ? "border-amber-300" : "border-primary/50",
      )}
    >
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl border bg-muted/30">
            <BriefcaseBusiness className="size-5" />
          </span>
          <div>
            <h3 className="font-heading text-xl font-bold">{application.company}</h3>
            <p className="mt-1 text-muted-foreground">
              {application.role} · {application.source}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{application.nextAction}</p>
          </div>
        </div>
        <Badge variant="outline" className={cn("w-fit gap-1.5", status.className)}>
          {status.icon}
          {status.label}
        </Badge>
      </div>

      <div className="border-t bg-muted/[0.12] p-6">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock3 className="size-4" />
          Started {application.updatedLabel.toLowerCase()}
        </p>

        {application.state === "draft" && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border bg-white p-5">
            <LoaderCircle className="size-5 animate-spin" />
            <div>
              <p className="font-semibold">Application assistant is reviewing the form</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Detecting required fields and matching them to your profile.
              </p>
            </div>
          </div>
        )}

        {application.state === "needs_input" && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 p-5">
            <p className="font-semibold">Missing profile fields</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {missingQuestions.map((question) => (
                <li key={question}>Select the appropriate answer for “{question}”</li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={onFillMissing}>Fill missing data</Button>
              <Button render={<Link href="/app/profile" />} variant="outline">
                Edit full profile
              </Button>
            </div>
          </div>
        )}

        {application.state === "ready_for_review" && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
            <CheckCircle2 className="size-5 text-emerald-600" />
            <div>
              <p className="font-semibold">Application answers are ready for review</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Nothing will be submitted until you confirm the final answers.
              </p>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {application.state !== "draft" && (
            <Button render={<Link href={`/app/applications/${application.id}`} />}>
              <FileText className="size-4" />
              Continue application
            </Button>
          )}
          <Button render={<Link href="/app/jobs" />} variant="ghost">
            Back to Jobs
          </Button>
          <Button variant="ghost">
            <ExternalLink className="size-4" />
            Open Job URL
          </Button>
        </div>
      </div>
    </Card>
  );
}

function statusDetails(state: ApplicationState) {
  if (state === "draft") {
    return {
      label: "Queued",
      className: "bg-white",
      icon: <Clock3 className="size-3.5" />,
    };
  }
  if (state === "needs_input") {
    return {
      label: "Missing Profile Info",
      className: "border-amber-300 bg-amber-50 text-amber-800",
      icon: <Clock3 className="size-3.5" />,
    };
  }
  if (state === "ready_for_review") {
    return {
      label: "Ready to Review",
      className: "border-emerald-300 bg-emerald-50 text-emerald-800",
      icon: <CheckCircle2 className="size-3.5" />,
    };
  }
  if (state === "submitted") {
    return {
      label: "Submitted",
      className: "border-emerald-300 bg-emerald-50 text-emerald-800",
      icon: <CheckCircle2 className="size-3.5" />,
    };
  }
  return {
    label: "Needs attention",
    className: "border-red-300 bg-red-50 text-red-800",
    icon: <Clock3 className="size-3.5" />,
  };
}
