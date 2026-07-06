"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    if (isSupabaseConfigured()) await createBrowserSupabaseClient()?.auth.updateUser({ password });
    else await new Promise((resolve) => window.setTimeout(resolve, 500));
    setLoading(false);
    setComplete(true);
    window.setTimeout(() => router.push("/sign-in"), 1000);
  }

  if (complete) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
        <h1 className="mt-5 font-heading text-2xl font-semibold">Password updated</h1>
        <p className="mt-3 text-sm text-muted-foreground">Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-3xl font-semibold tracking-[-0.04em]">Choose a new password</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Use at least 8 characters.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input id="new-password" name="password" type="password" minLength={8} required />
        </div>
        <Button type="submit" className="h-11 w-full" disabled={loading}>
          {loading && <LoaderCircle className="size-4 animate-spin" />}
          Update password
        </Button>
      </form>
    </div>
  );
}
