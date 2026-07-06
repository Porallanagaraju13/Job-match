"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "jobmatch.saved-jobs";
const CHANGE_EVENT = "jobmatch:saved-jobs-changed";
const defaultSaved = ["job-1", "job-2"];

function readSavedJobs() {
  if (typeof window === "undefined") return defaultSaved;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSaved));
    return defaultSaved;
  }

  try {
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : defaultSaved;
  } catch {
    return defaultSaved;
  }
}

export function useSavedJobs() {
  const [savedJobIds, setSavedJobIds] = useState<string[]>(defaultSaved);

  useEffect(() => {
    const refresh = () => setSavedJobIds(readSavedJobs());
    refresh();
    void fetch("/api/saved-jobs")
      .then((response) => response.json())
      .then((payload: { mode?: string; jobIds?: string[] }) => {
        if (payload.mode === "supabase" && Array.isArray(payload.jobIds)) {
          setSavedJobIds(payload.jobIds);
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.jobIds));
        }
      })
      .catch(() => undefined);
    window.addEventListener("storage", refresh);
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(CHANGE_EVENT, refresh);
    };
  }, []);

  const toggleSaved = useCallback((jobId: string) => {
    const current = readSavedJobs();
    const wasSaved = current.includes(jobId);
    const next = wasSaved ? current.filter((id) => id !== jobId) : [...current, jobId];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    void fetch("/api/saved-jobs", {
      method: wasSaved ? "DELETE" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId }),
    }).catch(() => undefined);
  }, []);

  return {
    savedJobIds,
    isSaved: (jobId: string) => savedJobIds.includes(jobId),
    toggleSaved,
  };
}
