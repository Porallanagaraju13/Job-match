import { describe, expect, it } from "vitest";
import { assessResumeExtraction } from "./resume-quality";
import { extractProfileFromText } from "./text-profile";

const representativeResume = `
Priya Sharma
Senior Full Stack Developer
priya.sharma@example.com | +91 98765 43210 | Bengaluru, India

SUMMARY
Full stack developer with six years of experience building reliable web applications.

TECHNICAL SKILLS
TypeScript, React, Next.js, Node.js, PostgreSQL, AWS, Docker

PROFESSIONAL EXPERIENCE
Senior Software Engineer | Acme Technologies | Jan 2022 - Present
- Built React and Next.js applications used by enterprise customers.
- Designed Node.js APIs backed by PostgreSQL.

Software Engineer | Example Labs | Jun 2019 - Dec 2021
- Delivered TypeScript services and automated deployments on AWS.

EDUCATION
ABC Institute of Technology - B.Tech in Computer Science

PROJECTS
Hiring Platform: Applicant tracking platform built with Next.js and PostgreSQL.

CERTIFICATIONS
AWS Certified Developer - Associate
`;

describe("resume text profile benchmark", () => {
  it("extracts the critical profile fields and structured sections", () => {
    const profile = extractProfileFromText(representativeResume, "priya-resume.pdf");
    const quality = assessResumeExtraction(profile);

    expect(profile.fullName).toBe("Priya Sharma");
    expect(profile.email).toBe("priya.sharma@example.com");
    expect(profile.phone.replace(/\D/g, "")).toContain("919876543210");
    expect(profile.skills).toEqual(expect.arrayContaining(["TypeScript", "React", "Next.js", "PostgreSQL"]));
    expect(profile.experiences.length).toBeGreaterThanOrEqual(2);
    expect(profile.education.length).toBeGreaterThanOrEqual(1);
    expect(profile.projects.length).toBeGreaterThanOrEqual(1);
    expect(profile.certifications.length).toBeGreaterThanOrEqual(1);
    expect(quality.completenessScore).toBeGreaterThanOrEqual(85);
  });

  it("flags partial data for enhancement and review", () => {
    const profile = extractProfileFromText("Priya Sharma\nReact Developer", "partial.pdf");
    const quality = assessResumeExtraction(profile);

    expect(quality.needsAiEnhancement).toBe(true);
    expect(quality.missingFields).toEqual(expect.arrayContaining(["email", "experiences", "education"]));
  });
});
