import "server-only";

import { GreenhouseAdapter } from "@/server/jobs/greenhouse";
import { isIndiaJob } from "@/server/jobs/india";
import { LeverAdapter } from "@/server/jobs/lever";
import { inferWorkMode, stripHtml, type NormalizedSourceJob } from "@/server/jobs/source-adapter";

type ProviderSearch = {
  roleQuery: string;
  locationQuery: string;
  skills: string[];
};

const requestTimeoutMs = 8_000;

const careerBoards = [
  { provider: "greenhouse", company: "Figma", key: "figma" },
  { provider: "greenhouse", company: "Stripe", key: "stripe" },
  { provider: "greenhouse", company: "Databricks", key: "databricks" },
  { provider: "greenhouse", company: "MongoDB", key: "mongodb" },
  { provider: "greenhouse", company: "Cloudflare", key: "cloudflare" },
  { provider: "lever", company: "Vercel", key: "vercel" },
  { provider: "lever", company: "PostHog", key: "posthog" },
  { provider: "lever", company: "Sourcegraph", key: "sourcegraph" },
  { provider: "lever", company: "Retool", key: "retool" },
] as const;

function withTimeout(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  return fetch(url, {
    ...init,
    cache: "no-store",
    signal: controller.signal,
    headers: {
      accept: "application/json",
      "user-agent": "JobMatch provider sync",
      ...init.headers,
    },
  }).finally(() => clearTimeout(timer));
}

function promiseTimeout<T>(promise: Promise<T>, label: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), requestTimeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function compactText(...values: Array<string | null | undefined>) {
  return values.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function termsFor(search: ProviderSearch) {
  return [search.roleQuery, ...search.skills.slice(0, 5)]
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((term) => term.length > 1);
}

function roughlyMatchesSearch(job: NormalizedSourceJob, search: ProviderSearch) {
  const terms = termsFor(search);
  if (!terms.length) return true;
  const haystack = compactText(job.title, job.description, job.company).toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

async function fetchRemotive(search: ProviderSearch): Promise<NormalizedSourceJob[]> {
  const query = encodeURIComponent([search.roleQuery, ...search.skills.slice(0, 3)].join(" "));
  const response = await withTimeout(`https://remotive.com/api/remote-jobs?search=${query}&limit=40`);
  if (!response.ok) throw new Error(`Remotive returned ${response.status}`);
  const payload = (await response.json()) as {
    jobs?: Array<{
      id?: number | string;
      title?: string;
      company_name?: string;
      url?: string;
      candidate_required_location?: string;
      job_type?: string;
      publication_date?: string;
      description?: string;
      tags?: string[];
    }>;
  };

  return (payload.jobs ?? [])
    .filter((job) => job.title && job.url)
    .map((job): NormalizedSourceJob => {
      const description = stripHtml(job.description ?? "");
      return {
        source: "Remotive",
        externalId: `remotive-${job.id ?? job.url}`,
        company: job.company_name ?? "Remote company",
        title: job.title ?? "Open role",
        description,
        location: job.candidate_required_location ?? "Remote",
        workMode: "Remote",
        employmentType: job.job_type?.toLowerCase().includes("contract") ? "Contract" : "Full-time",
        applyUrl: job.url ?? "",
        postedAt: job.publication_date ?? null,
        sourceUpdatedAt: job.publication_date ?? null,
        raw: job,
      };
    })
    .filter((job) => roughlyMatchesSearch(job, search));
}

async function fetchArbeitnow(search: ProviderSearch): Promise<NormalizedSourceJob[]> {
  const response = await withTimeout("https://www.arbeitnow.com/api/job-board-api");
  if (!response.ok) throw new Error(`Arbeitnow returned ${response.status}`);
  const payload = (await response.json()) as {
    data?: Array<{
      slug?: string;
      company_name?: string;
      title?: string;
      description?: string;
      url?: string;
      location?: string;
      remote?: boolean;
      job_types?: string[];
      created_at?: number;
      tags?: string[];
    }>;
  };

  return (payload.data ?? [])
    .filter((job) => job.title && job.url)
    .map((job): NormalizedSourceJob => {
      const description = stripHtml(job.description ?? "");
      const location = job.remote ? "Remote" : job.location ?? search.locationQuery;
      return {
        source: "Arbeitnow",
        externalId: `arbeitnow-${job.slug ?? job.url}`,
        company: job.company_name ?? "Company",
        title: job.title ?? "Open role",
        description,
        location,
        workMode: inferWorkMode(location, description),
        employmentType: (job.job_types ?? []).join(" ").toLowerCase().includes("contract")
          ? "Contract"
          : "Full-time",
        applyUrl: job.url ?? "",
        postedAt: job.created_at ? new Date(job.created_at * 1000).toISOString() : null,
        sourceUpdatedAt: null,
        raw: job,
      };
    })
    .filter((job) => roughlyMatchesSearch(job, search));
}

async function fetchRemoteOk(search: ProviderSearch): Promise<NormalizedSourceJob[]> {
  const response = await withTimeout("https://remoteok.com/api");
  if (!response.ok) throw new Error(`RemoteOK returned ${response.status}`);
  const payload = (await response.json()) as Array<{
    id?: string | number;
    position?: string;
    company?: string;
    description?: string;
    url?: string;
    apply_url?: string;
    location?: string;
    date?: string;
    tags?: string[];
  }>;

  return payload
    .filter((job) => job.position && (job.apply_url || job.url))
    .map((job): NormalizedSourceJob => {
      const description = stripHtml(job.description ?? "");
      return {
        source: "RemoteOK",
        externalId: `remoteok-${job.id ?? job.url}`,
        company: job.company ?? "Remote company",
        title: job.position ?? "Open role",
        description,
        location: job.location ?? "Remote",
        workMode: "Remote",
        employmentType: "Full-time",
        applyUrl: job.apply_url || job.url || "",
        postedAt: job.date ?? null,
        sourceUpdatedAt: job.date ?? null,
        raw: job,
      };
    })
    .filter((job) => roughlyMatchesSearch(job, search));
}

async function fetchCareerBoards(search: ProviderSearch) {
  const settled = await Promise.allSettled(
    careerBoards.map(async (board) => {
      if (board.provider === "greenhouse") {
        return promiseTimeout(
          new GreenhouseAdapter(board.company).listJobs(board.key),
          `${board.company} Greenhouse`,
        );
      }
      return promiseTimeout(new LeverAdapter(board.company).listJobs(board.key), `${board.company} Lever`);
    }),
  );

  return settled
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((job) => roughlyMatchesSearch(job, search));
}

export async function discoverDirectProviderJobs(search: ProviderSearch) {
  const settled = await Promise.allSettled([
    fetchRemotive(search),
    fetchArbeitnow(search),
    fetchRemoteOk(search),
    fetchCareerBoards(search),
  ]);

  const jobs = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const seen = new Set<string>();
  return jobs.filter((job) => {
    const key = `${job.source}:${job.externalId || job.applyUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(job.applyUrl && job.title) && isIndiaJob(job);
  });
}
