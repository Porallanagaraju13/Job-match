"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/server/supabase/server";
import { fetchCloudJobsForUser } from "@/server/jobs/sync";

export async function syncCloudJobsAction() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Not authenticated" };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const result = await fetchCloudJobsForUser(user.id);
  
  if (result.success) {
    revalidatePath("/app/jobs");
  }

  return result;
}
