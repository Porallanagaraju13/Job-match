import "server-only";

import { getProfileDraftForCurrentUser } from "@/server/profile/repository";
import { createServerSupabaseClient } from "@/server/supabase/server";

export async function getAppContext() {
  const profile = await getProfileDraftForCurrentUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      profile,
      hasResume: true,
      dailyUsed: 0,
      dailyLimit: 5,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      profile,
      hasResume: true,
      dailyUsed: 0,
      dailyLimit: 5,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const [{ data: resume }, { data: usage }] = await Promise.all([
    supabase
      .from("resumes")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("usage_ledger")
      .select("quantity")
      .eq("user_id", user.id)
      .eq("usage_type", "assisted_application")
      .gte("occurred_at", `${today}T00:00:00.000Z`),
  ]);

  const dailyUsed = (usage ?? []).reduce((total, item) => total + Number(item.quantity ?? 0), 0);
  return {
    profile,
    hasResume: Boolean(resume),
    dailyUsed,
    dailyLimit: 5,
  };
}
