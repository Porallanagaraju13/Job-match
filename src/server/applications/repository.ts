import "server-only";


import type { Application, ApplicationState } from "@/lib/types";
import { createServerSupabaseClient } from "@/server/supabase/server";

function relation<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T | undefined) ?? null;
  return (value as T | null) ?? null;
}

function uiState(value: string): ApplicationState {
  if (value === "needs_input" || value === "ready_for_review" || value === "submitted" || value === "failed") {
    return value;
  }
  return "draft";
}

function sourceName(value: unknown): string {
  if (typeof value !== "string") return "Company Careers";
  const trimmed = value.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null" || trimmed === "Unknown") {
    return "Company Careers";
  }
  return trimmed;
}

export async function getApplicationsForCurrentUser(): Promise<Application[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows, error } = await supabase
    .from("applications")
    .select("id, job_id, state, current_step, updated_at, jobs(title, companies(name), job_sources(platform))")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error || !rows?.length) return [];

  return rows.map((row): Application => {
    const job = relation<{
      title?: string;
      companies?: unknown;
      job_sources?: unknown;
    }>(row.jobs);
    const company = relation<{ name?: string }>(job?.companies)?.name ?? "Unknown company";
    const state = uiState(row.state);
    return {
      id: row.id,
      jobId: row.job_id,
      company,
      role: job?.title ?? "Job application",
      state,
      updatedLabel: new Date(row.updated_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      source: sourceName(relation<{ platform?: string }>(job?.job_sources)?.platform),
      nextAction:
        state === "needs_input"
          ? "Complete missing information"
          : state === "ready_for_review"
            ? "Review mapped answers"
            : state === "submitted"
              ? "Watch for employer updates"
              : row.current_step ?? "Application in progress",
    };
  });
}

export async function getApplicationById(id: string): Promise<Application | null> {
  if (id === "app_preview") {
    return {
      id,
      jobId: "job-1",
      company: "Smart Working Solutions",
      role: "Senior Software Engineer",
      state: "ready_for_review",
      updatedLabel: "Just now",
      source: "Lever",
      nextAction: "Review mapped answers",
    };
  }
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: row, error } = await supabase
    .from("applications")
    .select("id, job_id, state, current_step, updated_at, jobs(title, companies(name), job_sources(platform))")
    .eq("user_id", user.id)
    .eq("id", id)
    .single();
  if (error || !row) return null;

  const job = relation<{
    title?: string;
    companies?: unknown;
    job_sources?: unknown;
  }>(row.jobs);
  const company = relation<{ name?: string }>(job?.companies)?.name ?? "Unknown company";
  const state = uiState(row.state);
  return {
    id: row.id,
    jobId: row.job_id,
    company,
    role: job?.title ?? "Job application",
    state,
    updatedLabel: new Date(row.updated_at).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    source: sourceName(relation<{ platform?: string }>(job?.job_sources)?.platform),
    nextAction:
      state === "needs_input"
        ? "Complete missing information"
        : state === "ready_for_review"
          ? "Review mapped answers"
          : state === "submitted"
            ? "Watch for employer updates"
            : row.current_step ?? "Application in progress",
  };
}
