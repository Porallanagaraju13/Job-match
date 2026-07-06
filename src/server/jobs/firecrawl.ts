import "server-only";

import { z } from "zod";

const firecrawlSearchResultSchema = z.object({
  position: z.number().optional(),
  url: z.string().url(),
  title: z.string().optional(),
  description: z.string().optional(),
  source: z.string().optional(),
});

const firecrawlSearchResponseSchema = z
  .object({
    success: z.boolean().optional(),
    data: z
      .union([
        z.object({
          web: z.array(firecrawlSearchResultSchema).default([]),
        }),
        z.array(firecrawlSearchResultSchema),
      ])
      .optional(),
    error: z.string().optional(),
  })
  .passthrough();

export type FirecrawlJobDiscoveryResult = {
  position: number;
  title: string;
  url: string;
  description: string;
  source?: string;
};

function normalizeResults(data: z.infer<typeof firecrawlSearchResponseSchema>["data"]) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.web;
}

export async function discoverJobPages(query: string, options: { location?: string } = {}) {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return [];

  const locationQuery = options.location ? ` ${options.location}` : "";
  const searchQuery = `${query}${locationQuery} jobs (site:naukri.com OR site:instahyre.com OR site:iimjobs.com OR site:hirist.tech OR site:hirist.com OR site:foundit.in OR site:wellfound.com)`;

  const limit = Math.floor(Math.random() * (8 - 5 + 1)) + 5;
  const response = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    cache: "no-store",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: searchQuery,
      limit,
      sources: ["web"],
    }),
  });

  const payload = firecrawlSearchResponseSchema.parse(await response.json().catch(() => ({})));
  if (!response.ok) throw new Error(payload.error ?? `Firecrawl returned ${response.status}`);
  if (payload.error) throw new Error(`Firecrawl search failed: ${payload.error}`);

  return normalizeResults(payload.data).map(
    (result, index): FirecrawlJobDiscoveryResult => ({
      position: result.position ?? index + 1,
      title: result.title ?? "Untitled job page",
      url: result.url,
      description: result.description ?? "View the original posting for details.",
      source: result.source,
    }),
  );
}
