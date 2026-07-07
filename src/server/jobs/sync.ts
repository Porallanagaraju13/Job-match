import "server-only";

import { GoogleGenAI } from "@google/genai";
import { createHash, randomUUID } from "node:crypto";
import { discoverJobPages, type FirecrawlJobDiscoveryResult } from "@/server/jobs/firecrawl";
import { scoreJob, type MatchProfile } from "@/server/matching/score-job";
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

function hostname(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function pathSegments(value: string) {
  try {
    return new URL(value).pathname.split("/").filter(Boolean);
  } catch {
    return [];
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
  return "Unknown";
}

function companyFromUrl(value: string) {
  const host = hostname(value) ?? "";
  const segments = pathSegments(value);

  if ((host.includes("wellfound.com") || host.includes("angel.co")) && segments[1]) {
    return titleCase(segments[1]);
  }

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
    .split(/\s+[|–—-]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const withoutCompany = parts.find((part) => normalize(part) !== normalize(companyName));
  return withoutCompany || rawTitle || "Open Role";
}

function fingerprintFor(parts: string[]) {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

function workModeFrom(description: string, locationQuery: string) {
  const haystack = `${description} ${locationQuery}`.toLowerCase();
  if (haystack.includes("remote")) return "Remote";
  if (haystack.includes("hybrid")) return "Hybrid";
  return "On-site";
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
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

function sourceUrlFor(canonicalUrl: string) {
  const host = hostname(canonicalUrl);
  return host ? `https://${host}` : canonicalUrl;
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
    targetRoles.length > 0 || !usesLegacyDemoProfile
      ? targetRoles[0] ?? asString(profile.headline, "Software Engineer")
      : "Software Engineer";
  const locationQuery =
    preferredLocations[0] ?? (usesLegacyDemoProfile ? "Remote" : asString(profile.location, "Remote"));
  const skillQuery = profileSkills.slice(0, 4).join(" ");
  const searchQuery = [roleQuery, skillQuery].filter(Boolean).join(" ");
  const matchProfile: MatchProfile = {
    skills: profileSkills,
    targetRoles: targetRoles.length ? targetRoles : [roleQuery],
    preferredLocations: preferredLocations.length ? preferredLocations : [locationQuery],
    workModes: workModes.length ? workModes : ["Remote", "Hybrid", "On-site"],
    seniorityLevels: seniorityLevels.length ? seniorityLevels : ["Senior", "Lead", "Mid"],
    minimumSalary:
      typeof preferences?.minimum_salary === "number" ? preferences.minimum_salary : undefined,
  };

  if (!process.env.FIRECRAWL_API_KEY) {
    return { error: "FIRECRAWL_API_KEY not configured" };
  }

  let discoveries: FirecrawlJobDiscoveryResult[];
  try {
    discoveries = await discoverJobPages(searchQuery, { location: locationQuery });
  } catch {
    return { error: "Could not reach Firecrawl. Check the key and network, then try again." };
  }

  if (!discoveries.length) {
    return { error: "No jobs found from Firecrawl for this profile yet." };
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

  let added = 0;
  const fetchLimit = Math.floor(Math.random() * (8 - 5 + 1)) + 5;
  for (const discovery of discoveries.slice(0, fetchLimit)) {
    const canonicalUrl = discovery.url;
    const platform = platformFromUrl(canonicalUrl);
    const sourceDomain = hostname(canonicalUrl);
    const sourceUrl = sourceUrlFor(canonicalUrl);
    const companyName = companyFromUrl(canonicalUrl);
    const title = roleTitleFromSearchResult(discovery, companyName);
    const description = discovery.description || "View the original posting for details.";
    const externalId = fingerprintFor([platform, companyName, title, canonicalUrl]);
    const workMode = workModeFrom(description, locationQuery);
    const deterministicMatch = scoreJob(matchProfile, {
      title,
      description,
      tags: [platform, ...profileSkills.slice(0, 6)],
      location: locationQuery,
      workMode,
      seniority: "Level not specified",
      postedAt: new Date().toISOString(),
    });

    const { data: existingJob } = await writeSupabase
      .from("jobs")
      .select("id")
      .eq("external_id", externalId)
      .maybeSingle();
    let jobId = existingJob?.id;

    if (!jobId) {
      jobId = randomUUID();
      const normalizedCompany = normalize(companyName) || "unknown";

      const { data: company } = await writeSupabase
        .from("companies")
        .select("id")
        .eq("normalized_name", normalizedCompany)
        .maybeSingle();

      let companyId = company?.id;
      if (!companyId) {
        companyId = randomUUID();
        const { error: companyError } = await writeSupabase.from("companies").insert({
          id: companyId,
          name: companyName,
          normalized_name: normalizedCompany,
          domain: sourceDomain,
          careers_url: sourceUrl,
        });
        if (companyError) return { error: `Could not save company: ${companyError.message}` };
      }

      const { data: existingSource } = await writeSupabase
        .from("job_sources")
        .select("id")
        .eq("platform", platform)
        .eq("source_url", sourceUrl)
        .maybeSingle();

      let sourceId = existingSource?.id;
      if (!sourceId) {
        sourceId = randomUUID();
        const { error: sourceError } = await writeSupabase.from("job_sources").insert({
          id: sourceId,
          company_id: companyId,
          platform,
          source_url: sourceUrl,
          status: "active",
          last_synced_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          metadata: { provider: "firecrawl", source: discovery.source ?? "web" },
        });
        if (sourceError) return { error: `Could not save job source: ${sourceError.message}` };
      }

      const { error: insertJobError } = await writeSupabase.from("jobs").insert({
        id: jobId,
        source_id: sourceId,
        external_id: externalId,
        title,
        normalized_title: normalize(title) || "unknown-role",
        description,
        locations: [locationQuery],
        work_mode: workMode,
        employment_type: "Full-time",
        seniority: "Level not specified",
        apply_url: canonicalUrl,
        canonical_url: canonicalUrl,
        tags: Array.from(new Set([platform, roleQuery, ...profileSkills.slice(0, 4)])).filter(Boolean),
        posted_at: new Date().toISOString(),
        company_id: companyId,
        source_payload: discovery,
        fingerprint: fingerprintFor([platform, companyName, title, canonicalUrl]),
      });

      if (insertJobError) {
        return { error: `Could not save fetched job: ${insertJobError.message}` };
      }
    }

    let score = deterministicMatch.score;
    let explanation = deterministicMatch.reasons.length
      ? deterministicMatch.reasons
      : [`Matched your target role: ${roleQuery}`];

    if (ai && description) {
      try {
        const aiResponse = await ai.models.generateContent({
          model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Profile summary: ${asString(profile.summary, "")}\nLocation: ${locationQuery}\nTarget: ${searchQuery}\n\nJob Title: ${title}\nJob Description: ${description}`,
                },
                {
                  text: 'Evaluate how well this candidate matches the job. Return JSON: { "score": number between 0 and 100, "reasons": ["short reason 1", "short reason 2"] }',
                },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });

        if (aiResponse.text) {
          const matchData = JSON.parse(aiResponse.text) as { score?: unknown; reasons?: unknown };
          score = typeof matchData.score === "number" ? Math.max(score, Math.round(matchData.score)) : score;
          const aiReasons = Array.isArray(matchData.reasons)
            ? matchData.reasons.filter((reason): reason is string => typeof reason === "string")
            : [];
          explanation = aiReasons.length ? aiReasons : explanation;
        }
      } catch {
        // Keep the deterministic score when AI matching is unavailable.
      }
    }

    const { error: matchError } = await writeSupabase.from("job_matches").upsert(
      {
        user_id: userId,
        job_id: jobId,
        score: Math.min(100, Math.max(1, score)),
        components: deterministicMatch.components,
        explanation,
      },
      { onConflict: "user_id,job_id" },
    );

    if (matchError) {
      return { error: `Could not save job match: ${matchError.message}` };
    }

    added++;
  }

  return { success: true, count: added };
}
