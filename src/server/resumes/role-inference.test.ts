import { describe, expect, it } from "vitest";
import { inferTargetRoles } from "./role-inference";

describe("inferTargetRoles", () => {
  it("keeps explicit resume titles ahead of skill-derived roles", () => {
    expect(
      inferTargetRoles({
        headline: "React Developer",
        skills: ["React", "TypeScript", "Node.js", "PostgreSQL"],
        experiences: [{ title: "Frontend Developer" }],
      }),
    ).toEqual(expect.arrayContaining(["React Developer", "Frontend Developer", "Full Stack Developer"]));
  });

  it("maps data resumes to data roles", () => {
    expect(
      inferTargetRoles({
        skills: ["SQL", "Power BI", "Excel", "Data Analysis"],
      })[0],
    ).toBe("Data Analyst");
  });

  it("maps marketing resumes to marketing roles", () => {
    expect(
      inferTargetRoles({
        skills: ["SEO", "Google Ads", "Content Marketing"],
      })[0],
    ).toBe("Digital Marketing Specialist");
  });
});
