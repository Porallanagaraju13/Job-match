import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { discoverDirectProviderJobs } from "@/server/jobs/direct-providers";
import { discoverJobPages, type FirecrawlJobDiscoveryResult } from "@/server/jobs/firecrawl";
import { inferWorkMode, type NormalizedSourceJob } from "@/server/jobs/source-adapter";
import { scoreJob, type MatchProfile, type MatchResult } from "@/server/matching/score-job";
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

function inferRoleFromSkills(skills: string[]) {
  const lowerSkills = skills.map((skill) => skill.toLowerCase());
  if (lowerSkills.some((skill) => ["react", "next.js", "typescript", "javascript"].includes(skill))) {
    return "Frontend Developer";
  }
  if (lowerSkills.some((skill) => ["node.js", "express", "postgresql", "mongodb"].includes(skill))) {
    return "Backend Developer";
  }
  if (lowerSkills.some((skill) => ["python", "machine learning", "deep learning", "llm"].includes(skill))) {
    return "AI Engineer";
  }
  if (lowerSkills.some((skill) => ["data analysis", "power bi", "tableau", "sql"].includes(skill))) {
    return "Data Analyst";
  }
  if (lowerSkills.some((skill) => ["seo", "google ads", "digital marketing", "content marketing"].includes(skill))) {
    return "Digital Marketing Specialist";
  }
  return "Software Engineer";
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

  const externalId = job.externalId || fingerprintFor([job.source, job.company, job.title, job.applyUrl]);
  const { data: existingJob } = await supabase
    .from("jobs")
    .select("id")
    .eq("source_id", sourceId)
    .eq("external_id", externalId)
    .maybeSingle();

  const now = new Date().toISOString();
  const tags = Array.from(new Set([job.source, roleQuery, ...skills.slice(0, 6)])).filter(Boolean);
  let jobId = existingJob?.id;
  if (!jobId) {
    jobId = randomUUID();
    const { error } = await supabase.from("jobs").insert({
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
      apply_url: job.applyUrl,
      canonical_url: job.applyUrl,
      tags,
      posted_at: job.postedAt ?? now,
      source_updated_at: job.sourceUpdatedAt,
      company_id: companyId,
      source_payload: job.raw,
      fingerprint: fingerprintFor([job.source, job.company, job.title, job.applyUrl]),
      last_seen_at: now,
    });
    if (error) return { error: `Could not save fetched job: ${error.message}` };
  } else {
    await supabase
      .from("jobs")
      .update({
        title: job.title,
        description: job.description,
        locations: [job.location],
        work_mode: job.workMode,
        apply_url: job.applyUrl,
        tags,
        closed_at: null,
        last_seen_at: now,
      })
      .eq("id", jobId);
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

  const [{ data: profile }, { data: preferences }, { data: skills }] = await Promise.all([
    sessionSupabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    sessionSupabase
      .from("job_preferences")
      .select("target_roles, preferred_locations, work_modes, seniority_levels, minimum_salary")
      .eq("user_id", userId)
      .maybeSingle(),
    sessionSupabase.from("profile_skills").select("skill").eq("user_id", userId).order("skill"),
  ]);

  if (!profile) return { error: "Profile not found" };

  const usesLegacyDemoProfile = isLegacyDemoProfile(profile);
  const targetRoles = stringArray(preferences?.target_roles);
  const profileSkills = usesLegacyDemoProfile ? [] : stringArray((skills ?? []).map((item) => item.skill));
  const preferredLocations = stringArray(preferences?.preferred_locations);
  const workModes = stringArray(preferences?.work_modes);
  const seniorityLevels = stringArray(preferences?.seniority_levels);
  const roleQuery =
    targetRoles[0] ??
    (usesLegacyDemoProfile ? "Software Engineer" : asString(profile.headline, inferRoleFromSkills(profileSkills)));
  const locationQuery =
    preferredLocations[0] ?? (usesLegacyDemoProfile ? "Remote" : asString(profile.location, "Remote"));
  const matchProfile: MatchProfile = {
    skills: profileSkills,
    targetRoles: targetRoles.length ? targetRoles : [roleQuery],
    preferredLocations: preferredLocations.length ? preferredLocations : [locationQuery],
    workModes: workModes.length ? workModes : ["Remote", "Hybrid", "On-site"],
    seniorityLevels: seniorityLevels.length ? seniorityLevels : ["Senior", "Lead", "Mid"],
    minimumSalary:
      typeof preferences?.minimum_salary === "number" ? preferences.minimum_salary : undefined,
  };

  const directJobs = await discoverDirectProviderJobs({
    roleQuery,
    locationQuery,
    skills: profileSkills,
  });

  let providerJobs = directJobs;
  if (providerJobs.length < 8 && process.env.FIRECRAWL_API_KEY) {
    try {
      const discoveries = await discoverJobPages([roleQuery, ...profileSkills.slice(0, 3)].join(" "), {
        location: locationQuery,
      });
      providerJobs = [
        ...providerJobs,
        ...discoveries.map((discovery) => firecrawlToProviderJob(discovery, locationQuery)),
      ];
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
