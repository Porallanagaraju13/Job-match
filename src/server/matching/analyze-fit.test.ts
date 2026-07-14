import { describe, expect, it } from "vitest";
import { analyzeJobFit } from "./analyze-fit";

describe("analyzeJobFit", () => {
  it("separates supported skills from missing posting keywords without inventing evidence", () => {
    const result = analyzeJobFit(
      {
        fullName: "Priya Sharma",
        headline: "React Developer",
        email: "priya@example.com",
        phone: "",
        location: "Bengaluru",
        summary: "Frontend developer",
        skills: ["React", "TypeScript"],
        targetRoles: ["Frontend Developer"],
        experiences: [],
        education: [],
        projects: [],
        certifications: [],
      },
      {
        title: "Frontend Engineer",
        description: "Build React and TypeScript applications deployed with Docker and AWS.",
        tags: [],
        matchScore: 80,
      },
    );

    expect(result.matchedSkills).toEqual(expect.arrayContaining(["React", "TypeScript"]));
    expect(result.missingKeywords).toEqual(expect.arrayContaining(["Docker", "AWS"]));
    expect(result.recommendations.join(" ")).toContain("If accurate");
  });
});
