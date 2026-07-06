"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, MapPin, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";


const workModes = ["Remote", "Hybrid", "On-site"] as const;

export function PreferencesForm() {
  const router = useRouter();

  const [modes, setModes] = useState<Array<(typeof workModes)[number]>>(["Remote", "Hybrid"]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState("San Francisco, CA");
  const [minimumSalary, setMinimumSalary] = useState("140000");



  function toggleMode(mode: (typeof workModes)[number]) {
    setModes((current) => (current.includes(mode) ? current.filter((item) => item !== mode) : [...current, mode]));
  }

  async function finish() {
    setLoading(true);
    const response = await fetch("/api/preferences", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        targetRoles: [],
        preferredLocations: location.trim() ? [location.trim()] : [],
        workModes: modes,
        seniorityLevels: ["Senior", "Lead"],
        minimumSalary: minimumSalary ? Number(minimumSalary) : null,
        salaryCurrency: "USD",
      }),
    });
    if (!response.ok) {
      setLoading(false);
      return;
    }
    window.localStorage.setItem("jobmatch.onboarding-complete", "true");
    window.setTimeout(() => router.push("/app/jobs"), 650);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        <p className="text-sm font-semibold text-primary">Step 3 of 3</p>
        <h1 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.035em]">What should we look for?</h1>
        <p className="mx-auto mt-4 max-w-2xl leading-7 text-muted-foreground">
          These preferences create hard filters before JobMatch calculates a match score.
        </p>
      </div>

      <Card className="mt-8 p-6 sm:p-8">
        <div className="space-y-7">


          <section className="pt-2">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              <Label>Preferred location</Label>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location-city" className="text-xs text-muted-foreground">
                  City or region
                </Label>
                <Input
                  id="location-city"
                  name="locationCity"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-distance" className="text-xs text-muted-foreground">
                  Search radius
                </Label>
                <select
                  id="location-distance"
                  name="searchRadius"
                  defaultValue="50"
                  className="h-8 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <option value="25">Within 25 miles</option>
                  <option value="50">Within 50 miles</option>
                  <option value="100">Within 100 miles</option>
                  <option value="any">Anywhere</option>
                </select>
              </div>
            </div>
          </section>

          <section className="border-t pt-7">
            <Label>Work mode</Label>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {workModes.map((mode) => {
                const selected = modes.includes(mode);
                return (
                  <button
                    type="button"
                    key={mode}
                    onClick={() => toggleMode(mode)}
                    className={cn(
                      "cursor-pointer rounded-lg border p-4 text-left transition-colors",
                      selected ? "border-emerald-300 bg-emerald-50/70" : "bg-card hover:border-slate-300 hover:bg-muted/30",
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span className="font-semibold">{mode}</span>
                      {selected && <Check className="size-4 text-primary" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="border-t pt-7">
            <Label htmlFor="min-salary">Minimum base compensation</Label>
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <Input
                id="min-salary"
                name="minimumSalary"
                type="number"
                value={minimumSalary}
                onChange={(event) => setMinimumSalary(event.target.value)}
                aria-label="Minimum base salary"
              />
              <Badge variant="secondary" className="h-8 px-3">
                USD / year
              </Badge>
            </div>
          </section>

          <section className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-5">
            <div className="flex items-start gap-3">
              <SlidersHorizontal className="mt-0.5 size-5 text-primary" />
              <div>
                <p className="font-semibold">Your first feed is ready to build</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  We will start with recent verified roles, apply your hard filters, and explain each
                  match using the profile you approved.
                </p>
              </div>
            </div>
          </section>
        </div>

        <Button size="lg" className="mt-8 h-11 w-full" onClick={finish} disabled={loading}>
          {loading ? "Building your feed…" : "Finish & see my matches"}
          {!loading && <ArrowRight className="size-4" />}
        </Button>
      </Card>
    </div>
  );
}
