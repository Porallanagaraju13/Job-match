import { NextResponse } from "next/server";

import { discoverDirectProviderJobs } from "@/server/jobs/direct-providers";
import { GreenhouseAdapter } from "@/server/jobs/greenhouse";
import { LeverAdapter } from "@/server/jobs/lever";
import { scoreJob, type MatchProfile } from "@/server/matching/score-job";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const source = url.searchParams.get("source");
  const sourceKey = url.searchParams.get("key");
  const company = url.searchParams.get("company") ?? "Company";
  const query = url.searchParams.get("q");

  if (query) {
    try {
      const location = url.searchParams.get("location") ?? "Remote";
      const skills = url.searchParams.get("skills")?.split(",").map((skill) => skill.trim()).filter(Boolean) ?? [];
      const jobs = await discoverDirectProviderJobs({
        roleQuery: query,
        locationQuery: location,
        skills,
      });
      const matchProfile: MatchProfile = {
        skills,
        targetRoles: [query],
        preferredLocations: [location],
        workModes: ["Remote", "Hybrid", "On-site"],
        seniorityLevels: ["Senior", "Lead", "Mid", "Junior"],
      };
      const matches = jobs
        .map((job) => ({
          ...job,
          matchScore: scoreJob(matchProfile, {
            title: job.title,
            description: job.description,
            tags: [],
            location: job.location,
            workMode: job.workMode,
            postedAt: job.postedAt ?? undefined,
          }).score,
        }))
        .filter((job) => job.matchScore >= 35)
        .sort((left, right) => right.matchScore - left.matchScore)
        .slice(0, 50);
      return NextResponse.json({ mode: "direct-providers", jobs: matches });
    } catch {
      return NextResponse.json(
        { error: "Job discovery is temporarily unavailable.", provider: "direct-providers" },
        { status: 502 },
      );
    }
  }

  try {
    if (sourceKey && source === "greenhouse") {
      const jobs = await new GreenhouseAdapter(company).listJobs(sourceKey);
      return NextResponse.json({ mode: "live", jobs });
    }
    if (sourceKey && source === "lever") {
      const jobs = await new LeverAdapter(company).listJobs(sourceKey);
      return NextResponse.json({ mode: "live", jobs });
    }
  } catch {
    return NextResponse.json(
      { error: "The selected job source is temporarily unavailable.", provider: source },
      { status: 502 },
    );
  }

  return NextResponse.json({ mode: "demo", jobs: [] });
}
