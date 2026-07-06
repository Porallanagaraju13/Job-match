"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  CircleAlert,
  FileText,
  LoaderCircle,
  LockKeyhole,
  Send,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Application, ProfileDraft } from "@/lib/types";

export function ApplicationReviewPanel({
  application,
  profile,
}: {
  application: Application;
  profile: ProfileDraft;
}) {
  const [portfolio, setPortfolio] = useState("");
  const [note, setNote] = useState(
    "I am excited about this role because it combines product-led growth, B2B collaboration, and a strong craft culture.",
  );
  const [state, setState] = useState<"idle" | "submitting" | "submitted">(
    application.state === "submitted" ? "submitted" : "idle",
  );

  const needsPortfolio = application.state === "needs_input" && portfolio.length === 0;
  const mappedFields = [
    { label: "Full name", value: profile.fullName || "Not provided", source: "Profile" },
    { label: "Email", value: profile.email || "Not provided", source: "Account" },
    { label: "Phone", value: profile.phone || "Not provided", source: "Profile" },
    { label: "Location", value: profile.location || "Not provided", source: "Profile" },
    { label: "Headline", value: profile.headline || "Not provided", source: "Profile" },
    { label: "Resume", value: "Active uploaded resume", source: "Active resume" },
  ];

  async function submitApplication() {
    if (needsPortfolio) return;
    setState("submitting");
    const response = await fetch("/api/applications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ applicationId: application.id, state: "submitted" }),
    });
    setState(response.ok ? "submitted" : "idle");
  }

  if (state === "submitted") {
    return (
      <Card className="border-emerald-200 bg-emerald-50/80 p-8 text-center dark:border-emerald-900 dark:bg-emerald-950/20">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="size-7" />
        </span>
        <h2 className="mt-5 font-heading text-2xl font-semibold">Application submitted</h2>
        <p className="mx-auto mt-3 max-w-lg leading-7 text-muted-foreground">
          JobMatch recorded a successful confirmation for {application.company}. Watch your inbox for
          the employer’s confirmation and next steps.
        </p>
        <Badge variant="outline" className="mt-5 rounded-full bg-card">
          Confirmation · DEMO-{application.id.slice(-6).toUpperCase()}
        </Badge>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {application.state === "needs_input" && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
          <CircleAlert className="size-4 text-amber-700" />
          <AlertTitle>One required answer is missing</AlertTitle>
          <AlertDescription>Add your portfolio URL before reviewing the final application.</AlertDescription>
        </Alert>
      )}

      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 font-heading text-xl font-semibold">
              <ClipboardCheck className="size-5 text-primary" />
              Mapped profile answers
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Review every answer JobMatch plans to use.
            </p>
          </div>
          <Badge variant="secondary">{mappedFields.length} verified</Badge>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {mappedFields.map((field) => (
            <div key={field.label} className="rounded-lg border bg-muted/25 p-4">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs text-muted-foreground">{field.label}</Label>
                <Badge variant="outline" className="text-[10px]">
                  {field.source}
                </Badge>
              </div>
              <p className="mt-2 truncate text-sm font-medium">{field.value}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-heading text-xl font-semibold">Job-specific questions</h2>
        <div className="mt-5 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="portfolio">Portfolio URL {application.state === "needs_input" && "*"}</Label>
            <Input
              id="portfolio"
              name="portfolio"
              type="url"
              value={portfolio}
              onChange={(event) => setPortfolio(event.target.value)}
              placeholder="https://yourportfolio.com"
              aria-invalid={needsPortfolio}
            />
            {needsPortfolio && <p className="text-xs text-amber-700">This employer requires a portfolio link.</p>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="motivation">Why are you interested in this role?</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-primary"
                onClick={() =>
                  setNote(
                    "I am interested in this role because it aligns with my product engineering background and my experience building practical workflow tools."
                  )
                }
              >
                Suggest
              </Button>
            </div>
            <Textarea
              id="motivation"
              name="motivation"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Review and edit the suggested draft until it sounds like you.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 size-5 text-primary" />
          <div className="flex-1">
            <p className="font-semibold">Active uploaded resume</p>
            <p className="mt-1 text-sm text-muted-foreground">Active resume · Reviewed today</p>
          </div>
          <Badge variant="outline">PDF</Badge>
        </div>
      </Card>

      <Card className="border-primary/20 bg-primary/[0.035] p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 size-5 text-primary" />
            <div>
              <p className="font-semibold">Nothing is submitted without this confirmation</p>
              <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                By continuing, you confirm that the information above is accurate and authorize
                JobMatch to submit this single application.
              </p>
            </div>
          </div>
          <Button
            size="lg"
            className="h-11 shrink-0 px-6"
            onClick={submitApplication}
            disabled={needsPortfolio || state === "submitting"}
          >
            {state === "submitting" ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {state === "submitting" ? "Submitting…" : "Confirm & submit"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
