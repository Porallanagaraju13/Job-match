"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, LoaderCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    if (isSupabaseConfigured()) {
      await createBrowserSupabaseClient()?.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } else {
      await new Promise((resolve) => window.setTimeout(resolve, 500));
    }
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
        <h1 className="mt-5 font-heading text-2xl font-semibold">Check your inbox</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          If an account exists for that email, we sent a secure reset link.
        </p>
        <Button render={<Link href="/sign-in" />} variant="outline" className="mt-7 w-full">
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button render={<Link href="/sign-in" />} variant="ghost" className="-ml-2 mb-5">
        <ArrowLeft className="size-4" />
        Back
      </Button>
      <h1 className="font-heading text-3xl font-semibold tracking-[-0.04em]">Reset your password</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Enter your account email and we will send a password-reset link.
      </p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="reset-email" name="email" type="email" className="pl-9" required />
          </div>
        </div>
        <Button type="submit" className="h-11 w-full" disabled={loading}>
          {loading && <LoaderCircle className="size-4 animate-spin" />}
          Send reset link
        </Button>
      </form>
    </div>
  );
}
