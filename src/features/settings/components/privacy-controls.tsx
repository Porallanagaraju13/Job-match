"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type PrivacySettings = {
  retainAutomationRecordings: boolean;
  improvePersonalMatching: boolean;
  resumeRetentionDays: number;
};

const defaults: PrivacySettings = {
  retainAutomationRecordings: true,
  improvePersonalMatching: true,
  resumeRetentionDays: 365,
};

export function PrivacyControls() {
  const [settings, setSettings] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/privacy", { cache: "no-store" })
      .then(async (response) => ({ response, payload: await response.json() as { settings?: PrivacySettings; error?: string } }))
      .then(({ response, payload }) => {
        if (!response.ok) setError(payload.error ?? "Privacy settings require the pending database migration.");
        if (payload.settings) setSettings(payload.settings);
      })
      .catch(() => setError("Privacy settings could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  async function update(next: PrivacySettings) {
    const previous = settings;
    setSettings(next);
    setSaving(true);
    setError("");
    const response = await fetch("/api/privacy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setSettings(previous);
      setError(payload?.error ?? "Privacy settings require the pending database migration.");
    }
    setSaving(false);
  }

  if (loading) {
    return <LoaderCircle className="mx-auto my-8 size-5 animate-spin text-muted-foreground" />;
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="flex items-center justify-between gap-5 rounded-xl border p-4">
        <div>
          <Label htmlFor="session-recordings">Retain automation recordings</Label>
          <p className="mt-1 text-sm text-muted-foreground">Keep redacted session evidence for troubleshooting.</p>
        </div>
        <Switch
          id="session-recordings"
          checked={settings.retainAutomationRecordings}
          onCheckedChange={(checked) => void update({ ...settings, retainAutomationRecordings: checked })}
        />
      </div>
      <div className="flex items-center justify-between gap-5 rounded-xl border p-4">
        <div>
          <Label htmlFor="improve-matching">Use outcomes to improve my matching</Label>
          <p className="mt-1 text-sm text-muted-foreground">Use saves and dismissals only for your own feed.</p>
        </div>
        <Switch
          id="improve-matching"
          checked={settings.improvePersonalMatching}
          onCheckedChange={(checked) => void update({ ...settings, improvePersonalMatching: checked })}
        />
      </div>
      <div className="flex items-center justify-between gap-5 rounded-xl border p-4">
        <div>
          <Label htmlFor="resume-retention">Resume retention</Label>
          <p className="mt-1 text-sm text-muted-foreground">Choose how long uploaded resume files may be retained.</p>
        </div>
        <select
          id="resume-retention"
          value={settings.resumeRetentionDays}
          onChange={(event) => void update({ ...settings, resumeRetentionDays: Number(event.target.value) })}
          className="h-10 rounded-md border bg-white px-3 text-sm"
        >
          <option value={90}>90 days</option>
          <option value={365}>1 year</option>
          <option value={1095}>3 years</option>
          <option value={3650}>10 years</option>
        </select>
      </div>
      <p className="h-4 text-right text-xs text-muted-foreground">{saving ? "Saving privacy settings…" : "Settings saved automatically"}</p>
      {error && <p className="text-right text-xs text-amber-700">{error}</p>}
    </div>
  );
}
