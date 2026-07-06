import { scanApplicationForm } from "@/server/applications/browserbase";
import { GreenhouseAdapter } from "@/server/jobs/greenhouse";
import { LeverAdapter } from "@/server/jobs/lever";
import type { JobSourceAdapter } from "@/server/jobs/source-adapter";
import { inngest } from "@/server/inngest/client";
import { extractProfileFromResume } from "@/server/resumes/extract-profile";
import { createServiceRoleClient } from "@/server/supabase/server";

export const processResume = inngest.createFunction(
  {
    id: "process-resume",
    name: "Process uploaded resume",
    triggers: [{ event: "jobbuddy/resume.uploaded" }],
    retries: 4,
    concurrency: { limit: 1, key: "event.data.userId" },
  },
  async ({ event, step }) => {
    const { resumeId, userId, originalName } = event.data as {
      resumeId: string;
      userId: string;
      originalName: string;
    };

    const extraction = await step.run("extract-profile", async () => {
      const supabase = createServiceRoleClient();
      if (!supabase) return extractProfileFromResume({ originalName });
      const { data: resume, error: resumeError } = await supabase
        .from("resumes")
        .select("storage_path, mime_type")
        .eq("id", resumeId)
        .eq("user_id", userId)
        .single();
      if (resumeError || !resume) throw resumeError ?? new Error("Resume not found");
      const { data: file, error: downloadError } = await supabase.storage
        .from("resumes")
        .download(resume.storage_path);
      if (downloadError || !file) throw downloadError ?? new Error("Resume download failed");
      return extractProfileFromResume({
        originalName,
        bytes: new Uint8Array(await file.arrayBuffer()),
        mimeType: resume.mime_type,
      });
    });

    await step.run("store-profile-draft", async () => {
      const supabase = createServiceRoleClient();
      if (!supabase) return { mode: "demo", resumeId };

      const { error: extractionError } = await supabase.from("resume_extractions").insert({
        user_id: userId,
        resume_id: resumeId,
        parser_version: "fallback-v1",
        raw_data: extraction,
        confidence_map: extraction.confidence,
      });
      if (extractionError) throw extractionError;

      const { error: resumeError } = await supabase
        .from("resumes")
        .update({ status: "review_required" })
        .eq("id", resumeId)
        .eq("user_id", userId);
      if (resumeError) throw resumeError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ onboarding_state: "review_required" })
        .eq("id", userId);
      if (profileError) throw profileError;

      // Automatically map extracted data to profile
      const { upsertProfileFromExtraction } = await import("@/server/profile/repository");
      await upsertProfileFromExtraction(supabase, userId, extraction);

      return { mode: "supabase", resumeId };
    });

    return { resumeId, fields: Object.keys(extraction.confidence).length };
  },
);

export const refreshJobSources = inngest.createFunction(
  {
    id: "refresh-job-sources",
    name: "Refresh active job sources",
    triggers: [{ cron: "0 */4 * * *" }, { event: "jobbuddy/jobs.refresh.requested" }],
    retries: 3,
    concurrency: { limit: 3 },
  },
  async ({ step }) => {
    const supabase = createServiceRoleClient();
    if (!supabase) return { mode: "demo", refreshed: 0 };

    const { data: sources, error } = await supabase
      .from("job_sources")
      .select("id, platform, board_token, source_url, companies(name)")
      .eq("status", "active")
      .limit(50);
    if (error) throw error;

    let refreshed = 0;
    for (const source of sources ?? []) {
      await step.run(`refresh-${source.id}`, async () => {
        const companyRelation = source.companies as unknown as { name?: string } | null;
        const companyName = companyRelation?.name ?? "Unknown company";
        const sourceKey = source.board_token ?? source.source_url.split("/").filter(Boolean).pop() ?? "";
        let adapter: JobSourceAdapter | null = null;
        if (source.platform === "Greenhouse") adapter = new GreenhouseAdapter(companyName);
        if (source.platform === "Lever") adapter = new LeverAdapter(companyName);
        if (!adapter || !sourceKey) return { skipped: true };

        const jobs = await adapter.listJobs(sourceKey);
        await supabase
          .from("job_sources")
          .update({ last_synced_at: new Date().toISOString(), last_success_at: new Date().toISOString() })
          .eq("id", source.id);
        refreshed += jobs.length;
        return { count: jobs.length };
      });
    }
    return { mode: "supabase", refreshed };
  },
);

export const prepareApplication = inngest.createFunction(
  {
    id: "prepare-application",
    name: "Scan and prepare application",
    triggers: [{ event: "jobbuddy/application.prepare.requested" }],
    retries: 2,
    concurrency: [
      { limit: 1, key: "event.data.userId" },
      { limit: 5, key: "event.data.platform" },
    ],
  },
  async ({ event, step }) => {
    const { applicationId, userId, applyUrl } = event.data as {
      applicationId: string;
      userId: string;
      applyUrl: string;
      platform: string;
    };

    const scan = await step.run("scan-application-form", () => scanApplicationForm(applyUrl));
    await step.run("save-scan-result", async () => {
      const supabase = createServiceRoleClient();
      if (!supabase) return { mode: "demo" };
      const { error } = await supabase
        .from("applications")
        .update({
          state: "ready_for_review",
          current_step: "review",
          provider_run_id: scan.sessionId ?? null,
        })
        .eq("id", applicationId)
        .eq("user_id", userId);
      if (error) throw error;
      return { mode: "supabase" };
    });
    return { applicationId, detectedFields: scan.fields.length };
  },
);

export const inngestFunctions = [processResume, refreshJobSources, prepareApplication];
