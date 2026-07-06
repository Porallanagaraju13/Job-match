import "server-only";

import { createServerSupabaseClient } from "@/server/supabase/server";

export type ResumeRecord = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  active: boolean;
  uploadedAt: string;
};

export async function getResumesForCurrentUser(): Promise<ResumeRecord[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("resumes")
    .select("id, original_name, mime_type, size_bytes, status, is_active, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  return data.map((resume) => ({
    id: resume.id,
    name: resume.original_name,
    mimeType: resume.mime_type,
    sizeBytes: Number(resume.size_bytes),
    status: resume.status,
    active: resume.is_active,
    uploadedAt: resume.created_at,
  }));
}
