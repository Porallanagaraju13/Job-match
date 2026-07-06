import type { JobSource, WorkMode } from "@/lib/types";

export type NormalizedSourceJob = {
  source: JobSource;
  externalId: string;
  company: string;
  title: string;
  description: string;
  location: string;
  workMode: WorkMode;
  employmentType: "Full-time" | "Contract";
  applyUrl: string;
  postedAt: string | null;
  sourceUpdatedAt: string | null;
  raw: unknown;
};

export interface JobSourceAdapter {
  readonly source: JobSource;
  listJobs(sourceKey: string): Promise<NormalizedSourceJob[]>;
}

export function inferWorkMode(...values: Array<string | undefined | null>): WorkMode {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  if (text.includes("remote")) return "Remote";
  if (text.includes("hybrid")) return "Hybrid";
  return "On-site";
}

export function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
