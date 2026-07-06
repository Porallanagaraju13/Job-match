import "server-only";

import { z } from "zod";
import {
  inferWorkMode,
  stripHtml,
  type JobSourceAdapter,
  type NormalizedSourceJob,
} from "@/server/jobs/source-adapter";

const leverPostingSchema = z.object({
  id: z.string(),
  text: z.string(),
  hostedUrl: z.string().url(),
  createdAt: z.number().optional().nullable(),
  updatedAt: z.number().optional().nullable(),
  descriptionPlain: z.string().optional().default(""),
  description: z.string().optional().default(""),
  categories: z
    .object({
      location: z.string().optional().nullable(),
      commitment: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
});

const leverResponseSchema = z.array(leverPostingSchema);

export class LeverAdapter implements JobSourceAdapter {
  readonly source = "Lever" as const;

  constructor(private readonly company: string) {}

  async listJobs(siteName: string): Promise<NormalizedSourceJob[]> {
    const response = await fetch(
      `https://api.lever.co/v0/postings/${encodeURIComponent(siteName)}?mode=json`,
      { cache: "no-store", headers: { accept: "application/json" } },
    );
    if (!response.ok) throw new Error(`Lever returned ${response.status}`);

    const payload = leverResponseSchema.parse(await response.json());
    return payload.map((posting) => {
      const description = posting.descriptionPlain || stripHtml(posting.description);
      const location = posting.categories?.location ?? "Location not specified";
      const commitment = posting.categories?.commitment ?? "";

      return {
        source: this.source,
        externalId: posting.id,
        company: this.company,
        title: posting.text,
        description,
        location,
        workMode: inferWorkMode(location, description),
        employmentType: commitment.toLowerCase().includes("contract") ? "Contract" : "Full-time",
        applyUrl: posting.hostedUrl,
        postedAt: posting.createdAt ? new Date(posting.createdAt).toISOString() : null,
        sourceUpdatedAt: posting.updatedAt ? new Date(posting.updatedAt).toISOString() : null,
        raw: posting,
      };
    });
  }
}
