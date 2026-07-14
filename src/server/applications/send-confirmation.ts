import "server-only";

import { createServiceRoleClient } from "@/server/supabase/server";

export async function sendApplicationConfirmation({
  userId,
  applicationId,
  company,
  role,
  source,
}: {
  userId: string;
  applicationId: string;
  company?: string;
  role?: string;
  source?: string;
}) {
  const supabase = createServiceRoleClient();
  if (!supabase) return { delivered: false, reason: "service-role-not-configured" };

  const companyName = company || "the company";
  const roleName = role || "the position";
  const sourceName = source || "the job board";
  const { data: userData } = await supabase.auth.admin.getUserById(userId);
  const email = userData?.user?.email;
  const subject = `Application submitted to ${companyName}`;
  const message = [
    `Your application for ${roleName} at ${companyName} via ${sourceName} was recorded as submitted.`,
    `Application reference: ${applicationId.slice(-8).toUpperCase()}`,
    "Watch your inbox for the employer's confirmation and next steps.",
  ].join("\n\n");

  let delivered = false;
  let providerId: string | null = null;
  if (email && process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [email],
        subject,
        text: message,
      }),
      signal: AbortSignal.timeout(5_000),
    });
    const payload = (await response.json().catch(() => null)) as { id?: string } | null;
    delivered = response.ok;
    providerId = payload?.id ?? null;
  }

  await supabase.from("application_events").insert({
    user_id: userId,
    application_id: applicationId,
    event_type: delivered ? "confirmation.delivered" : "confirmation.recorded",
    safe_metadata: { company: companyName, role: roleName, source: sourceName, providerId },
  });

  return { delivered, providerId };
}
