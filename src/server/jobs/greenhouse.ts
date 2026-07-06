import "server-only";

import { z } from "zod";
import {
  inferWorkMode,
  stripHtml,
  type JobSourceAdapter,
  type NormalizedSourceJob,
} from "@/server/jobs/source-adapter";

const greenhouseResponseSchema = z.object({
  jobs: z
    .array(
      z.object({
        id: z.union([z.string(), z.number()]),
        title: z.string(),
        absolute_url: z.string().url(),
        content: z.string().optional().default(""),
        updated_at: z.string().optional().nullable(),
        location: z
          .object({
            name: z.string().optional().nullable(),
          })
          .optional()
          .nullable(),
      }),
    )
    .default([]),
});

export class GreenhouseAdapter implements JobSourceAdapter {
  readonly source = "Greenhouse" as const;

  constructor(private readonly company: string) {}

  async listJobs(boardToken: string): Promise<NormalizedSourceJob[]> {
    const response = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`,
      { cache: "no-store", headers: { accept: "application/json" } },
    );
    if (!response.ok) throw new Error(`Greenhouse returned ${response.status}`);

    const payload = greenhouseResponseSchema.parse(await response.json());
    return payload.jobs.map((job) => {
      const description = stripHtml(job.content);
      const location = job.location?.name ?? "Location not specified";

      return {
        source: this.source,
        externalId: String(job.id),
        company: this.company,
        title: job.title,
        description,
        location,
        workMode: inferWorkMode(location, description),
        employmentType: "Full-time",
        applyUrl: job.absolute_url,
        postedAt: null,
        sourceUpdatedAt: job.updated_at ?? null,
        raw: job,
      };
    });
  }
}
