import { NextResponse } from "next/server";

import { discoverJobPages } from "@/server/jobs/firecrawl";
import { GreenhouseAdapter } from "@/server/jobs/greenhouse";
import { LeverAdapter } from "@/server/jobs/lever";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const source = url.searchParams.get("source");
  const sourceKey = url.searchParams.get("key");
  const company = url.searchParams.get("company") ?? "Company";
  const query = url.searchParams.get("q");

  if (query) {
    try {
      const discoveries = await discoverJobPages(query, {
        location: url.searchParams.get("location") ?? undefined,
      });
      return NextResponse.json({ mode: process.env.FIRECRAWL_API_KEY ? "firecrawl" : "demo", discoveries });
    } catch {
      return NextResponse.json(
        { error: "Job discovery is temporarily unavailable.", provider: "firecrawl" },
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
