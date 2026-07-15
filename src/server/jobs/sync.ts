import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { discoverDirectProviderJobs } from "@/server/jobs/direct-providers";
import { discoverJobPages, type FirecrawlJobDiscoveryResult } from "@/server/jobs/firecrawl";
import { indiaSearchLocation, isIndiaJob } from "@/server/jobs/india";
import { inferWorkMode, type NormalizedSourceJob } from "@/server/jobs/source-adapter";
import { scoreJob, type MatchProfile, type MatchResult } from "@/server/matching/score-job";
import { inferTargetRoles } from "@/server/resumes/role-inference";
import { createServerSupabaseClient, createServiceRoleClient } from "@/server/supabase/server";

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function uniqueSearchRoles(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalize(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hostname(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function titleCase(value: string) {
  const cleaned = value.replace(/[-_]+/g, " ").trim();
  if (!cleaned) return "Unknown";
  return cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function platformFromUrl(value: string) {
  const host = hostname(value) ?? "";
  if (host.includes("naukri.com")) return "Naukri";
  if (host.includes("instahyre.com")) return "Instahyre";
  if (host.includes("iimjobs.com")) return "IIMJobs";
  if (host.includes("hirist.tech") || host.includes("hirist.com")) return "Hirist";
  if (host.includes("foundit.in")) return "Foundit";
  if (host.includes("wellfound.com") || host.includes("angel.co")) return "Wellfound";
  if (host.includes("greenhouse.io")) return "Greenhouse";
  if (host.includes("lever.co")) return "Lever";
  return "Career Page";
}

function companyFromUrl(value: string) {
  const host = hostname(value) ?? "";
  return titleCase(host.split(".").filter(Boolean)[0] ?? "Unknown");
}

function roleTitleFromSearchResult(result: FirecrawlJobDiscoveryResult, companyName: string) {
  const rawTitle = result.title
    .replace(/\s*[-|]\s*Naukri\.com\s*$/i, "")
    .replace(/\s*[-|]\s*Instahyre\s*$/i, "")
    .replace(/\s*[-|]\s*IIMjobs\.com\s*$/i, "")
    .replace(/\s*[-|]\s*hirist\.tech\s*$/i, "")
    .replace(/\s*[-|]\s*Foundit\s*$/i, "")
    .trim();

  const parts = rawTitle
    .split(/\s+[-|–—]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const withoutCompany = parts.find((part) => normalize(part) !== normalize(companyName));
  return withoutCompany || rawTitle || "Open Role";
}

function fingerprintFor(parts: string[]) {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

function canonicalJobUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|source$|ref$|referrer$|tracking|trk$)/i.test(key)) url.searchParams.delete(key);
    }
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString();
  } catch {
    return value.trim();
  }
}

function jobIdentity(job: Pick<NormalizedSourceJob, "company" | "title" | "location">) {
  return fingerprintFor([normalize(job.company), normalize(job.title), normalize(job.location)]);
}

function sourceUrlFor(canonicalUrl: string) {
  const host = hostname(canonicalUrl);
  return host ? `https://${host}` : canonicalUrl;
}

function isLegacyDemoProfile(value: {
  full_name?: string | null;
  email?: string | null;
  summary?: string | null;
} | null | undefined) {
  return (
    value?.full_name === "Alex Morgan" &&
    (value.email === "alex@example.com" ||
      value.summary?.startsWith("Reviewed profile draft created from "))
  );
}

function firecrawlToProviderJob(
  discovery: FirecrawlJobDiscoveryResult,
  locationQuery: string,
): NormalizedSourceJob {
  const company = companyFromUrl(discovery.url);
  const description = discovery.description || "View the original posting for details.";
  return {
    source: platformFromUrl(discovery.url),
    externalId: `firecrawl-${fingerprintFor([discovery.url, discovery.title])}`,
    company,
    title: roleTitleFromSearchResult(discovery, company),
    description,
    location: locationQuery,
    workMode: inferWorkMode(locationQuery, description),
    employmentType: "Full-time",
    applyUrl: discovery.url,
    postedAt: new Date().toISOString(),
    sourceUpdatedAt: null,
    raw: discovery,
  };
}

function scoreProviderJob(matchProfile: MatchProfile, job: NormalizedSourceJob) {
  return scoreJob(matchProfile, {
    title: job.title,
    description: job.description,
    tags: [],
    location: job.location,
    workMode: job.workMode,
    postedAt: job.postedAt ?? undefined,
  });
}

function dedupeProviderJobs(jobs: NormalizedSourceJob[]) {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    const identities = [`url:${canonicalJobUrl(job.applyUrl)}`, `role:${jobIdentity(job)}`];
    if (identities.some((key) => seen.has(key))) return false;
    identities.forEach((key) => seen.add(key));
    return true;
  });
}

async function saveMatchedJob({
  supabase,
  userId,
  job,
  match,
  roleQuery,
  skills,
}: {
  supabase: SupabaseClient;
  userId: string;
  job: NormalizedSourceJob;
  match: MatchResult;
  roleQuery: string;
  skills: string[];
}) {
  const sourceDomain = hostname(job.applyUrl);
  const sourceUrl = sourceUrlFor(job.applyUrl);
  const normalizedCompany = normalize(job.company) || "unknown";

  const { data: companyRow } = await supabase
    .from("companies")
    .select("id")
    .eq("normalized_name", normalizedCompany)
    .maybeSingle();

  let companyId = companyRow?.id;
  if (!companyId) {
    companyId = randomUUID();
    const { error } = await supabase.from("companies").insert({
      id: companyId,
      name: job.company,
      normalized_name: normalizedCompany,
      domain: sourceDomain,
      careers_url: sourceUrl,
    });
    if (error) return { error: `Could not save company: ${error.message}` };
  }

  const { data: sourceRow } = await supabase
    .from("job_sources")
    .select("id")
    .eq("platform", job.source)
    .eq("source_url", sourceUrl)
    .maybeSingle();

  let sourceId = sourceRow?.id;
  if (!sourceId) {
    sourceId = randomUUID();
    const { error } = await supabase.from("job_sources").insert({
      id: sourceId,
      company_id: companyId,
      platform: job.source,
      source_url: sourceUrl,
      status: "active",
      last_synced_at: new Date().toISOString(),
      last_success_at: new Date().toISOString(),
      metadata: { provider: job.source },
    });
    if (error) return { error: `Could not save job source: ${error.message}` };
  }

  const canonicalUrl = canonicalJobUrl(job.applyUrl);
  const identityFingerprint = jobIdentity(job);
  const externalId = job.externalId || identityFingerprint;
  const { data: existingJob } = await supabase
    .from("jobs")
    .select("id")
    .or(`and(source_id.eq.${sourceId},external_id.eq.${externalId}),fingerprint.eq.${identityFingerprint}`)
    .limit(1)
    .maybeSingle();

  const now = new Date().toISOString();
  const tags = Array.from(new Set([job.source, roleQuery, ...skills.slice(0, 6)])).filter(Boolean);
  let jobId = existingJob?.id;
  if (!jobId) {
    jobId = randomUUID();
    const jobRecord = {
      id: jobId,
      source_id: sourceId,
      external_id: externalId,
      title: job.title,
      normalized_title: normalize(job.title) || "open-role",
      description: job.description,
      locations: [job.location],
      work_mode: job.workMode,
      employment_type: job.employmentType,
      seniority: "Level not specified",
      apply_url: canonicalUrl,
      canonical_url: canonicalUrl,
      tags,
      posted_at: job.postedAt ?? now,
      source_updated_at: job.sourceUpdatedAt,
      company_id: companyId,
      source_payload: job.raw,
      fingerprint: identityFingerprint,
      last_seen_at: now,
      last_verified_at: now,
      verification_failures: 0,
    };
    let { error } = await supabase.from("jobs").insert(jobRecord);
    if (error && /last_verified_at|verification_failures/i.test(error.message)) {
      const { last_verified_at, verification_failures, ...legacyJobRecord } = jobRecord;
      void last_verified_at;
      void verification_failures;
      const legacyInsert = await supabase.from("jobs").insert(legacyJobRecord);
      error = legacyInsert.error;
    }
    if (error?.code === "23505") {
      const { data: concurrentJob } = await supabase
        .from("jobs")
        .select("id")
        .eq("fingerprint", identityFingerprint)
        .limit(1)
        .maybeSingle();
      jobId = concurrentJob?.id;
    } else if (error) {
      return { error: `Could not save fetched job: ${error.message}` };
    }
    if (!jobId) return { error: "Could not resolve the canonical job record." };
  } else {
    const updateRecord = {
      title: job.title,
      description: job.description,
      locations: [job.location],
      work_mode: job.workMode,
      apply_url: canonicalUrl,
      canonical_url: canonicalUrl,
      fingerprint: identityFingerprint,
      tags,
      closed_at: null,
      last_seen_at: now,
      last_verified_at: now,
      verification_failures: 0,
    };
    const updateResult = await supabase
      .from("jobs")
      .update(updateRecord)
      .eq("id", jobId);
    if (updateResult.error && /last_verified_at|verification_failures/i.test(updateResult.error.message)) {
      const { last_verified_at, verification_failures, ...legacyUpdateRecord } = updateRecord;
      void last_verified_at;
      void verification_failures;
      await supabase.from("jobs").update(legacyUpdateRecord).eq("id", jobId);
    }
  }

  const explanation = match.reasons.length
    ? match.reasons
    : [`Matched your target role: ${roleQuery}`];

  const { error: matchError } = await supabase.from("job_matches").upsert(
    {
      user_id: userId,
      job_id: jobId,
      score: Math.min(100, Math.max(1, match.score)),
      components: match.components,
      explanation,
    },
    { onConflict: "user_id,job_id" },
  );
  if (matchError) return { error: `Could not save job match: ${matchError.message}` };

  return { success: true };
}

export async function fetchCloudJobsForUser(userId: string) {
  const sessionSupabase = await createServerSupabaseClient();
  if (!sessionSupabase) return { error: "No DB connection" };

  const writeSupabase = createServiceRoleClient();
  if (!writeSupabase) {
    return {
      error:
        "SUPABASE_SECRET_KEY is required to save fetched jobs. Add the server-side service-role key, then retry.",
    };
  }

  const { error: serviceKeyError } = await writeSupabase.from("companies").select("id").limit(1);
  if (serviceKeyError) {
    return {
      error:
        serviceKeyError.message === "Invalid API key"
          ? "SUPABASE_SECRET_KEY is invalid for this Supabase project. Copy the server-side secret/service_role key from Project Settings, then restart the app."
          : `Supabase service key check failed: ${serviceKeyError.message}`,
    };
  }

  const [{ data: profile }, { data: preferences }, { data: skills }, { data: experiences }] = await Promise.all([
    sessionSupabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    sessionSupabase
      .from("job_preferences")
      .select("target_roles, preferred_locations, work_modes, seniority_levels, minimum_salary")
      .eq("user_id", userId)
      .maybeSingle(),
    sessionSupabase.from("profile_skills").select("skill").eq("user_id", userId).order("skill"),
    sessionSupabase.from("experiences").select("title").eq("user_id", userId).order("position"),
  ]);

  if (!profile) return { error: "Profile not found" };

  const usesLegacyDemoProfile = isLegacyDemoProfile(profile);
  const targetRoles = stringArray(preferences?.target_roles);
  const profileSkills = usesLegacyDemoProfile ? [] : stringArray((skills ?? []).map((item) => item.skill));
  const inferredTargetRoles = usesLegacyDemoProfile
    ? ["Software Engineer"]
    : inferTargetRoles({
        headline: profile.headline,
        summary: profile.summary,
        skills: profileSkills,
        experiences: experiences ?? [],
      });
  const profileTargetRoles = targetRoles.length ? targetRoles : inferredTargetRoles;
  const preferredLocations = stringArray(preferences?.preferred_locations);
  const workModes = stringArray(preferences?.work_modes);
  const seniorityLevels = stringArray(preferences?.seniority_levels);
  const roleQuery = profileTargetRoles[0] ?? asString(profile.headline, "Software Engineer");
  const locationQuery = indiaSearchLocation(
    preferredLocations[0] ?? (usesLegacyDemoProfile ? "India" : asString(profile.location, "India")),
  );
  const matchProfile: MatchProfile = {
    skills: profileSkills,
    targetRoles: profileTargetRoles.length ? profileTargetRoles : [roleQuery],
    preferredLocations: [locationQuery],
    workModes: workModes.length ? workModes : ["Remote", "Hybrid", "On-site"],
    seniorityLevels: seniorityLevels.length ? seniorityLevels : ["Senior", "Lead", "Mid"],
    minimumSalary:
      typeof preferences?.minimum_salary === "number" ? preferences.minimum_salary : undefined,
  };

  const searchRoles = uniqueSearchRoles(profileTargetRoles.length ? profileTargetRoles : [roleQuery]).slice(0, 3);
  const directJobs = dedupeProviderJobs(
    (
      await Promise.all(
        searchRoles.map((searchRole) =>
          discoverDirectProviderJobs({
            roleQuery: searchRole,
            locationQuery,
            skills: profileSkills,
          }),
        ),
      )
    ).flat(),
  );

  let providerJobs = directJobs;
  if (providerJobs.length < 8 && process.env.FIRECRAWL_API_KEY) {
    try {
      const discoveries = await discoverJobPages([...searchRoles.slice(0, 2), ...profileSkills.slice(0, 3)].join(" "), {
        location: locationQuery,
      });
      providerJobs = dedupeProviderJobs([
        ...providerJobs,
        ...discoveries.map((discovery) => firecrawlToProviderJob(discovery, locationQuery)),
      ]).filter(isIndiaJob);
    } catch {
      // Direct provider results are still useful; Firecrawl is only a fallback.
    }
  }

  if (!providerJobs.length) {
    return {
      error:
        "No live openings were found from direct providers for this profile. Add more target roles or skills, then try again.",
    };
  }

  const scoredJobs = providerJobs
    .map((job) => ({ job, match: scoreProviderJob(matchProfile, job) }))
    .sort((left, right) => right.match.score - left.match.score);
  const relevantJobs = scoredJobs.filter(({ match }) => match.score >= 35);
  const jobsToSave = (relevantJobs.length ? relevantJobs : scoredJobs).slice(0, 20);

  let added = 0;
  for (const { job, match } of jobsToSave) {
    const result = await saveMatchedJob({
      supabase: writeSupabase,
      userId,
      job,
      match,
      roleQuery,
      skills: profileSkills,
    });
    if ("error" in result) return result;
    added++;
  }

  return {
    success: true,
    count: added,
    providers: Array.from(new Set(jobsToSave.map(({ job }) => job.source))),
  };
}
