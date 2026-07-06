"use client";

import { useState } from "react";
import { ExternalLink, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BillingPortalButton() {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const payload = (await response.json()) as { url?: string };
      window.location.assign(payload.url ?? "/app/billing?portal=unavailable");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="secondary" className="rounded-full" onClick={openPortal} disabled={loading}>
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
      Manage subscription
    </Button>
  );
}
