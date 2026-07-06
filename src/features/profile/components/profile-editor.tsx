"use client";

import { useMemo, useState } from "react";
import {
  Award,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ClipboardList,
  Code2,
  GraduationCap,
  Layers3,
  Plus,
  Save,
  UserRound,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { demoProfile } from "@/lib/demo-data";
import type { ProfileDraft } from "@/lib/types";

export function ProfileEditor({
  initialProfile = demoProfile,
  hasResume = false
}: {
  initialProfile?: ProfileDraft,
  hasResume?: boolean
}) {
  const [skills, setSkills] = useState(initialProfile.skills);
  const [newSkill, setNewSkill] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    fullName: initialProfile.fullName,
    headline: initialProfile.headline,
    email: initialProfile.email,
    phone: initialProfile.phone,
    location: initialProfile.location,
    summary: initialProfile.summary,
    linkedin: "",
    github: "",
  });

  const completeness = useMemo(() => {
    const checks = [
      Boolean(profile.fullName && profile.email && profile.phone && profile.location), // Basic Info
      Boolean(profile.summary),                                                       // Summary
      Boolean(profile.headline),                                                      // Work Experience
      Boolean(initialProfile.education.length > 0),                                   // Education
      skills.length > 0,                                                              // Skills
      Boolean(hasResume),                                                             // Resume status
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profile, skills, initialProfile.education, hasResume]);

  async function save() {
    setSaving(true);
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fullName: profile.fullName,
        headline: profile.headline,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        summary: profile.summary,
        skills,
      }),
    });
    setSaving(false);
    if (!response.ok) return;
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function addSkill() {
    const value = newSkill.trim();
    if (!value || skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) return;
    setSkills((current) => [...current, value]);
    setNewSkill("");
  }

  return (
    <div className="mt-8 grid gap-7 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="h-fit p-7 xl:sticky xl:top-24">
        <h2 className="font-heading text-xl font-semibold">Profile Completeness</h2>
        <div className="mt-7 flex items-center gap-5">
          <div
            className="grid size-32 shrink-0 place-items-center rounded-full"
            style={{ background: `conic-gradient(#059669 ${completeness * 3.6}deg, #e2e8f0 0deg)` }}
          >
            <div className="grid size-24 place-items-center rounded-full bg-white text-center">
              <span>
                <span className="block text-3xl font-semibold text-emerald-700">{completeness}%</span>
                <span className="block text-[11px] text-muted-foreground">Complete</span>
              </span>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold">
              {completeness === 100
                ? "Profile Complete!"
                : completeness >= 90
                ? "Almost Complete"
                : completeness >= 70
                ? "Good Progress"
                : "Getting Started"}
            </p>
            <p className="text-muted-foreground">
              {completeness === 100
                ? "Your profile is complete and ready for applications!"
                : completeness >= 90
                ? "Just a few more details to complete your profile."
                : completeness >= 70
                ? "You're making good progress. Keep going!"
                : "Add more information to strengthen your profile."}
            </p>
          </div>
        </div>

        <div className="mt-7 space-y-4 border-t pt-6 text-sm">
          {[
            ["Basic Information", Boolean(profile.fullName && profile.email && profile.phone && profile.location)],
            ["Summary", Boolean(profile.summary)],
            ["Work Experience", Boolean(profile.headline)],
            ["Education", Boolean(initialProfile.education.length > 0)],
            ["Skills", skills.length > 0],
            ["Resume", hasResume],
          ].map(([label, done]) => (
            <div key={String(label)} className="flex items-center gap-3">
              <CheckCircle2 className={done ? "size-5 text-emerald-600" : "size-5 text-amber-500"} />
              <span className="font-medium">{label}</span>
            </div>
          ))}
        </div>

        <Button className="mt-7 w-full font-bold" onClick={save} disabled={saving}>
          {saved ? <Check className="size-4" /> : <Save className="size-4" />}
          {saving ? "Saving..." : saved ? "Profile saved" : "Improve Profile"}
        </Button>
      </Card>

      <Tabs defaultValue="personal" className="min-w-0">
        <TabsList
          variant="line"
          className="w-full flex-wrap justify-start gap-x-7 gap-y-2 border-b pb-3"
        >
          <TabsTrigger value="personal" className="px-2 py-3">
            <UserRound /> Personal
          </TabsTrigger>
          <TabsTrigger value="summary" className="px-2 py-3">
            <ClipboardList /> Summary
          </TabsTrigger>
          <TabsTrigger value="skills" className="px-2 py-3">
            <Layers3 /> Skills
          </TabsTrigger>
          <TabsTrigger value="experience" className="px-2 py-3">
            <BriefcaseBusiness /> Experience
          </TabsTrigger>
          <TabsTrigger value="education" className="px-2 py-3">
            <GraduationCap /> Education
          </TabsTrigger>
          <TabsTrigger value="projects" className="px-2 py-3">
            <Code2 /> Projects
          </TabsTrigger>
          <TabsTrigger value="certifications" className="px-2 py-3">
            <Award /> Certifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="pt-6">
          <div className="space-y-5">
            <Field label="Full name" id="profile-name">
              <Input
                id="profile-name"
                value={profile.fullName}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, fullName: event.target.value }))
                }
              />
            </Field>
            <Field label="Email" id="profile-email">
              <Input
                id="profile-email"
                type="email"
                value={profile.email}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, email: event.target.value }))
                }
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Phone" id="profile-phone">
                <Input
                  id="profile-phone"
                  value={profile.phone}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </Field>
              <Field label="Location" id="profile-location">
                <Input
                  id="profile-location"
                  value={profile.location}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, location: event.target.value }))
                  }
                />
              </Field>
            </div>
            <Field label="Headline" id="profile-headline">
              <Input
                id="profile-headline"
                value={profile.headline}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, headline: event.target.value }))
                }
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="LinkedIn URL" id="profile-linkedin">
                <Input
                  id="profile-linkedin"
                  value={profile.linkedin}
                  placeholder="linkedin.com/in/your-name"
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, linkedin: event.target.value }))
                  }
                />
              </Field>
              <Field label="GitHub URL" id="profile-github">
                <Input
                  id="profile-github"
                  value={profile.github}
                  placeholder="github.com/your-name"
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, github: event.target.value }))
                  }
                />
              </Field>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="summary" className="pt-6">
          <Card className="p-6">
            <h3 className="font-heading text-xl font-bold">Professional Summary</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This is used to personalize matches and job-specific answers.
            </p>
            <Textarea
              id="profile-summary"
              className="mt-5 min-h-52"
              value={profile.summary}
              onChange={(event) =>
                setProfile((current) => ({ ...current, summary: event.target.value }))
              }
            />
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="pt-6">
          <Card className="p-6">
            <h3 className="font-heading text-xl font-bold">Skills</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Extracted skills can be corrected before they affect matching.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-2 px-3 py-2">
                  {skill}
                  <button
                    type="button"
                    onClick={() =>
                      setSkills((current) => current.filter((item) => item !== skill))
                    }
                    aria-label={`Remove ${skill}`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="mt-6 flex gap-2">
              <Input
                value={newSkill}
                placeholder="Add another skill"
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
          </Card>
        </TabsContent>

        <TabsContent value="experience" className="pt-6">
          <Card className="p-6">
            <SectionHeading title="Work Experience" />
            <div className="mt-6 space-y-3">
              {initialProfile.experiences.map((experience, index) => (
                <div key={`experience-${index}`} className="rounded-xl border p-5">
                  <p className="font-bold">{experience.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{experience.company}</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {experience.description}
                  </p>
                </div>
              ))}
              {initialProfile.experiences.length === 0 && <EmptyExtraction />}
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="education" className="pt-6">
          <Card className="p-6">
            <SectionHeading title="Education" />
            <div className="mt-6 space-y-3">
              {initialProfile.education.map((education, index) => (
                <div key={`education-${index}`} className="rounded-xl border p-5">
                  <p className="font-bold">{education.institution}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[education.degree, education.fieldOfStudy].filter(Boolean).join(" · ")}
                  </p>
                </div>
              ))}
              {initialProfile.education.length === 0 && <EmptyExtraction />}
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="projects" className="pt-6">
          <Card className="p-6">
            <SectionHeading title="Projects" />
            <div className="mt-6 space-y-3">
              {initialProfile.projects?.map((project, index) => (
                <div key={`project-${index}`} className="rounded-xl border p-5">
                  <p className="font-bold">{project.name}</p>
                  {project.link && (
                    <a href={project.link} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                      {project.link}
                    </a>
                  )}
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {project.description}
                  </p>
                </div>
              ))}
              {(!initialProfile.projects || initialProfile.projects.length === 0) && <EmptyExtraction />}
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="certifications" className="pt-6">
          <Card className="p-6">
            <SectionHeading title="Certifications" />
            <div className="mt-6 space-y-3">
              {initialProfile.certifications?.map((cert, index) => (
                <div key={`certification-${index}`} className="rounded-xl border p-5">
                  <p className="font-bold">{cert.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[cert.issuer, cert.date].filter(Boolean).join(" · ")}
                  </p>
                </div>
              ))}
              {(!initialProfile.certifications || initialProfile.certifications.length === 0) && <EmptyExtraction />}
            </div>
          </Card>
        </TabsContent>

        <div className="mt-7 flex justify-end">
          <Button className="px-6 font-bold" onClick={save} disabled={saving}>
            <Save className="size-4" />
            {saving ? "Saving..." : saved ? "Changes saved" : "Save changes"}
          </Button>
        </div>
      </Tabs>
    </div>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-1">
        <Label htmlFor={id} className="flex items-center">
          {label}
          {/* Optional: mark required fields with a subtle indicator */}
          {/* <span className="text-xs text-red-500">*</span> */}
        </Label>
      </div>
      {children}
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="font-heading text-xl font-bold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Review information extracted from your resume.
        </p>
      </div>
      <Button variant="outline">
        <Plus className="size-4" />
        Add
      </Button>
    </div>
  );
}

function EmptyExtraction() {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-3">
        <span className="flex items-center justify-center rounded-full bg-blue-50 p-3">
          <ClipboardList className="h-5 w-5 text-blue-500" />
        </span>
        <p>No information was detected</p>
        <p className="text-xs">
          Add your information using the form above or edit manually below
        </p>
      </div>
    );
  }
