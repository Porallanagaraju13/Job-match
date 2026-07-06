"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncCloudJobsAction } from "./actions";

export function SyncJobsButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  async function handleSync() {
    setLoading(true);
    setMessage(null);
    setStatus("idle");
    try {
      const result = await syncCloudJobsAction();
      if ("error" in result && result.error) {
        setStatus("error");
        setMessage(result.error);
        return;
      }
      setStatus("success");
      setMessage(`Fetched ${"count" in result ? result.count : 0} new matches.`);
    } catch {
      setStatus("error");
      setMessage("Job refresh failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" className="rounded-full" onClick={handleSync} disabled={loading}>
        {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}
        {loading ? "Searching..." : "Find New Matches"}
      </Button>
      {message ? (
        <p
          className={
            status === "error"
              ? "flex max-w-[320px] items-center gap-1 text-right text-xs text-destructive"
              : "flex items-center gap-1 text-xs text-emerald-700"
          }
        >
          {status === "error" ? <AlertCircle className="size-3" /> : <CheckCircle2 className="size-3" />}
          {message}
        </p>
      ) : null}
    </div>
  );
}
