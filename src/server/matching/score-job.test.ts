import { describe, expect, it } from "vitest";
import { scoreJob, type MatchProfile, type MatchableJob } from "./score-job";

const profile: MatchProfile = {
  skills: ["Product strategy", "Analytics", "User research", "B2B SaaS"],
  targetRoles: ["Senior Product Manager", "Product Lead"],
  preferredLocations: ["San Francisco, CA"],
  workModes: ["Remote", "Hybrid"],
  seniorityLevels: ["Senior", "Lead"],
  minimumSalary: 140_000,
};

const job: MatchableJob = {
  title: "Senior Product Manager",
  description: "Lead product strategy, analytics, and user research for a B2B SaaS platform.",
  tags: ["Product strategy", "B2B SaaS"],
  location: "San Francisco, CA",
  workMode: "Remote",
  seniority: "Senior level",
  salaryMin: 155_000,
  postedAt: "2026-07-03T08:00:00.000Z",
};

describe("scoreJob", () => {
  it("scores a strongly aligned role highly and explains the result", () => {
    const result = scoreJob(profile, job, new Date("2026-07-03T12:00:00.000Z"));
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.components.skills).toBe(40);
    expect(result.reasons).toContain("Strong skills overlap");
    expect(result.reasons).toContain("Target role aligned");
  });

  it("penalizes role, location, and compensation mismatches", () => {
    const result = scoreJob(
      profile,
      {
        ...job,
        title: "Junior Sales Associate",
        description: "Outbound sales role.",
        tags: ["Sales"],
        location: "London, UK",
        workMode: "On-site",
        seniority: "Junior",
        salaryMin: 55_000,
      },
      new Date("2026-07-03T12:00:00.000Z"),
    );
    expect(result.score).toBeLessThan(35);
  });

  it("always returns a score between zero and one hundred", () => {
    const result = scoreJob(
      { ...profile, skills: [], targetRoles: [], seniorityLevels: [] },
      { ...job, postedAt: "2020-01-01T00:00:00.000Z" },
      new Date("2026-07-03T12:00:00.000Z"),
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
