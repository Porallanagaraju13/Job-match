"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, ClipboardCheck, LoaderCircle, PencilLine, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { demoProfile } from "@/lib/demo-data";
import type { ProfileDraft } from "@/lib/types";
import { cn } from "@/lib/utils";

const tabs = ["Basics", "Skills", "Experience", "Education", "Projects", "Certifications"] as const;

export function ProfileReviewForm({ initialProfile = demoProfile }: { initialProfile?: ProfileDraft }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Basics");
  const [skills, setSkills] = useState(initialProfile.skills);
  const [newSkill, setNewSkill] = useState("");
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    fullName: initialProfile.fullName,
    headline: initialProfile.headline,
    email: initialProfile.email,
    phone: initialProfile.phone,
    location: initialProfile.location,
    summary: initialProfile.summary,
  });

  function addSkill() {
    const value = newSkill.trim();
    if (value && !skills.includes(value)) setSkills((current) => [...current, value]);
    setNewSkill("");
  }

  async function saveAndContinue() {
    setSaving(true);
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...profile, skills }),
    });
    setSaving(false);
    if (response.ok) router.push("/onboarding/preferences");
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="text-center">
        <p className="text-sm font-semibold text-primary">Step 2 of 3</p>
        <h1 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.035em]">Review your profile</h1>
        <p className="mx-auto mt-4 max-w-2xl leading-7 text-muted-foreground">
          This was extracted from your resume. Correct anything that is incomplete or unclear—this is the
          source JobMatch uses later.
        </p>
      </div>

      <Card className="mt-8 p-6">
        <div className="flex flex-col gap-4 rounded-lg border bg-emerald-50/60 p-4 sm:flex-row sm:items-center">
          <span className="grid size-11 place-items-center rounded-md border border-emerald-200 bg-white text-primary">
            <ClipboardCheck className="size-5" />
          </span>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Extraction confidence</p>
              <span className="font-heading font-bold text-primary">92%</span>
            </div>
            <Progress value={92} className="mt-2 h-1.5" />
            <p className="mt-2 text-xs text-muted-foreground">2 fields were marked for review.</p>
          </div>
        </div>

        <div className="mt-6 flex gap-1 overflow-x-auto border-b">
          {tabs.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setTab(item)}
              className={cn(
                "whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                tab === item
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item}
            </button>
          ))}
        </div>

        {tab === "Basics" && (
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="review-name">Full name</Label>
              <Input
                id="review-name"
                name="fullName"
                value={profile.fullName}
                onChange={(event) => setProfile((current) => ({ ...current, fullName: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-headline">Professional headline</Label>
              <Input
                id="review-headline"
                name="headline"
                value={profile.headline}
                onChange={(event) => setProfile((current) => ({ ...current, headline: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-email">Email</Label>
              <Input
                id="review-email"
                name="email"
                type="email"
                value={profile.email}
                onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-phone">Phone</Label>
              <Input
                id="review-phone"
                name="phone"
                value={profile.phone}
                onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="review-location">Location</Label>
              <Input
                id="review-location"
                name="location"
                value={profile.location}
                onChange={(event) => setProfile((current) => ({ ...current, location: event.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="review-summary">Summary</Label>
              <Textarea
                id="review-summary"
                name="summary"
                value={profile.summary}
                onChange={(event) => setProfile((current) => ({ ...current, summary: event.target.value }))}
                rows={5}
              />
            </div>
          </div>
        )}

        {tab === "Skills" && (
          <div className="mt-6">
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-2 py-1.5">
                  {skill}
                  <button
                    type="button"
                    onClick={() => setSkills((current) => current.filter((item) => item !== skill))}
                    aria-label={`Remove ${skill}`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <Input
                id="new-skill-input"
                name="newSkill"
                placeholder="Add another skill"
                value={newSkill}
                onChange={(event) => setNewSkill(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addSkill();
                  }
                }}
              />
              <Button variant="outline" onClick={addSkill}>
                <Plus className="size-4" />
                Add
              </Button>
            </div>
          </div>
        )}

        {tab === "Experience" && (
          <div className="mt-6 space-y-4">
            {initialProfile.experiences.map((exp, idx) => (
              <div key={idx} className="flex items-start gap-4 rounded-lg border p-4">
                <span className="grid size-10 place-items-center rounded-md bg-secondary text-primary">
                  <CheckCircle2 className="size-5" />
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{exp.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {exp.company} · {[exp.startDate, exp.endDate || "Present"].filter(Boolean).join(" – ")}
                  </p>
                </div>
                <Button variant="ghost" size="icon" aria-label={`Edit ${exp.title}`}>
                  <PencilLine className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {tab === "Education" && (
          <div className="mt-6 space-y-4">
            {initialProfile.education.map((edu, idx) => (
              <div key={idx} className="rounded-lg border p-5">
                <p className="font-semibold">{edu.degree ? `${edu.degree} in ${edu.fieldOfStudy}` : edu.fieldOfStudy}</p>
                <p className="mt-1 text-sm text-muted-foreground">{edu.institution}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "Projects" && (
          <div className="mt-6 space-y-4">
            {initialProfile.projects?.map((project, idx) => (
              <div key={idx} className="rounded-lg border p-5">
                <p className="font-semibold">{project.name}</p>
                {project.link && (
                  <p className="mt-1 text-sm text-blue-600 hover:underline"><a href={project.link} target="_blank" rel="noreferrer">{project.link}</a></p>
                )}
                <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "Certifications" && (
          <div className="mt-6 space-y-4">
            {initialProfile.certifications?.map((cert, idx) => (
              <div key={idx} className="rounded-lg border p-5">
                <p className="font-semibold">{cert.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[cert.issuer, cert.date].filter(Boolean).join(" · ")}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">You can edit this profile any time.</p>
          <Button className="h-11 px-6" onClick={saveAndContinue} disabled={saving}>
            {saving && <LoaderCircle className="size-4 animate-spin" />}
            {saving ? "Saving profile…" : "Profile looks right"}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
