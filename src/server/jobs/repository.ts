import "server-only";


import type { Job, WorkMode } from "@/lib/types";
import { demoJobs } from "@/lib/demo-data";
import { createServerSupabaseClient } from "@/server/supabase/server";

function relation<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T | undefined) ?? null;
  return (value as T | null) ?? null;
}

function sourceName(value: unknown): string {
  return String(value);
}

function workMode(value: unknown): WorkMode {
  return value === "Remote" || value === "Hybrid" ? value : "On-site";
}

function firstLocation(value: unknown) {
  if (typeof value === "string") return value;
  if (!Array.isArray(value) || value.length === 0) return "Location not specified";
  const first = value[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "name" in first && typeof first.name === "string") {
    return first.name;
  }
  return "Location not specified";
}

function salaryLabel(minimum: unknown, maximum: unknown, currency: unknown) {
  if (typeof minimum !== "number" && typeof maximum !== "number") return "Salary not listed";
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: typeof currency === "string" ? currency : "USD",
    notation: "compact",
    maximumFractionDigits: 0,
  });
  if (typeof minimum === "number" && typeof maximum === "number") {
    return `${formatter.format(minimum)} – ${formatter.format(maximum)}`;
  }
  return formatter.format((minimum ?? maximum) as number);
}

function postedLabel(postedAt: unknown) {
  if (typeof postedAt !== "string") return "recently";
  const hours = Math.max(1, Math.round((Date.now() - new Date(postedAt).getTime()) / 3_600_000));
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

export async function getJobsForCurrentUser(): Promise<Job[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return demoJobs;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return demoJobs;

  const { data: rows, error } = await supabase
    .from("jobs")
    .select(
      "id, external_id, title, description, locations, work_mode, employment_type, seniority, salary_min, salary_max, salary_currency, apply_url, tags, posted_at, companies(name), job_sources(platform)",
    )
    .is("closed_at", null)
    .order("posted_at", { ascending: false, nullsFirst: false })
    .limit(50);
  if (error || !rows?.length) return demoJobs;

  const jobIds = rows.map((row) => row.id);
  const { data: matchRows } = await supabase
    .from("job_matches")
    .select("job_id, score, explanation")
    .eq("user_id", user.id)
    .in("job_id", jobIds);
  const matches = new Map((matchRows ?? []).map((match) => [match.job_id, match]));

  return rows.map((row): Job => {
    const company = relation<{ name?: string }>(row.companies)?.name ?? "Unknown company";
    const source = sourceName(relation<{ platform?: string }>(row.job_sources)?.platform);
    const match = matches.get(row.id);
    const companyPalette = ["bg-indigo-500", "bg-pink-500", "bg-blue-600", "bg-emerald-600"];
    const colorIndex = company.charCodeAt(0) % companyPalette.length;

    return {
      id: row.id,
      source,
      externalId: row.external_id,
      company,
      companyInitial: company.slice(0, 1).toUpperCase(),
      companyColor: companyPalette[colorIndex],
      title: row.title,
      location: firstLocation(row.locations),
      workMode: workMode(row.work_mode),
      employmentType: row.employment_type === "Contract" ? "Contract" : "Full-time",
      seniority: row.seniority ?? "Level not specified",
      salary: salaryLabel(row.salary_min, row.salary_max, row.salary_currency),
      tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === "string") : [],
      matchScore: match?.score ?? 75,
      matchReasons:
        Array.isArray(match?.explanation) && match.explanation.length
          ? match.explanation
          : ["Matches your reviewed preferences"],
      postedLabel: postedLabel(row.posted_at),
      postedAt: row.posted_at ?? new Date().toISOString(),
      description: row.description ?? "View the original posting for the complete role description.",
      applyUrl: row.apply_url,
      status: "open",
    };
  });
}

export async function getJobById(id: string): Promise<Job | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return demoJobs.find((job) => job.id === id) ?? null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return demoJobs.find((job) => job.id === id) ?? null;

  const { data: row, error } = await supabase
    .from("jobs")
    .select(
      "id, external_id, title, description, locations, work_mode, employment_type, seniority, salary_min, salary_max, salary_currency, apply_url, tags, posted_at, companies(name), job_sources(platform)",
    )
    .eq("id", id)
    .is("closed_at", null)
    .single();
  if (error || !row) return demoJobs.find((job) => job.id === id) ?? null;

  const { data: matchRow } = await supabase
    .from("job_matches")
    .select("score, explanation")
    .eq("user_id", user.id)
    .eq("job_id", row.id)
    .single();

  const company = relation<{ name?: string }>(row.companies)?.name ?? "Unknown company";
  const source = sourceName(relation<{ platform?: string }>(row.job_sources)?.platform);
  const companyPalette = ["bg-indigo-500", "bg-pink-500", "bg-blue-600", "bg-emerald-600"];
  const colorIndex = company.charCodeAt(0) % companyPalette.length;

  return {
    id: row.id,
    source,
    externalId: row.external_id,
    company,
    companyInitial: company.slice(0, 1).toUpperCase(),
    companyColor: companyPalette[colorIndex],
    title: row.title,
    location: firstLocation(row.locations),
    workMode: workMode(row.work_mode),
    employmentType: row.employment_type === "Contract" ? "Contract" : "Full-time",
    seniority: row.seniority ?? "Level not specified",
    salary: salaryLabel(row.salary_min, row.salary_max, row.salary_currency),
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === "string") : [],
    matchScore: matchRow?.score ?? 75,
    matchReasons:
      Array.isArray(matchRow?.explanation) && matchRow.explanation.length
        ? matchRow.explanation
        : ["Matches your reviewed preferences"],
    postedLabel: postedLabel(row.posted_at),
    postedAt: row.posted_at ?? new Date().toISOString(),
    description: row.description ?? "View the original posting for the complete role description.",
    applyUrl: row.apply_url,
    status: "open",
  };
}
