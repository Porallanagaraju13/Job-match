"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StartApplicationButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function startApplication() {
    setLoading(true);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const payload = (await response.json()) as { id?: string };
      router.push(`/app/applications/${payload.id ?? "app_preview"}`);
    } catch {
      router.push("/app/applications/app_preview");
    }
  }

  return (
    <Button size="lg" className="h-11 px-6" onClick={startApplication} disabled={loading}>
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : <FileText className="size-4" />}
      {loading ? "Applying…" : "Apply with AI"}
    </Button>
  );
}
