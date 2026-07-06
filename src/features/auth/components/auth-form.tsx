"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const configured = isSupabaseConfigured();
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  const signingUp = mode === "sign-up";

  async function handleEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading("email");
    setError(null);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "");

    if (!configured) {
      window.setTimeout(() => router.push("/app/jobs"), 500);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const result = signingUp
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
      : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setError(result.error.message);
      setLoading(null);
      return;
    }

    if (signingUp && !result.data.session) {
      setVerificationEmail(email);
      setLoading(null);
      return;
    }

    router.push("/app/jobs");
    router.refresh();
  }

  async function handleGoogle() {
    setError(null);
    if (!googleEnabled) {
      setError("Google sign-in must be enabled in your Supabase Authentication providers.");
      return;
    }

    setLoading("google");
    if (!configured) {
      window.setTimeout(() => router.push("/app/jobs"), 500);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) {
      setError(authError.message);
      setLoading(null);
    }
  }

  if (verificationEmail) {
    return (
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
          <CheckCircle2 className="size-7" />
        </span>
        <h1 className="mt-5 font-heading text-3xl font-semibold tracking-[-0.035em]">
          Check your inbox
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          We sent a verification link to{" "}
          <span className="font-semibold text-foreground">{verificationEmail}</span>.
        </p>
        <Button variant="outline" className="mt-7 w-full" onClick={() => setVerificationEmail(null)}>
          Use another email
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-4xl font-semibold tracking-[-0.04em]">
        {signingUp ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-3 text-base leading-6 text-muted-foreground">
        {signingUp
          ? "Create your profile and start organizing your job search."
          : "Sign in to manage your jobs, profile, and applications."}
      </p>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        variant="outline"
        className="mt-9 h-12 w-full rounded-md text-base"
        onClick={handleGoogle}
        disabled={loading !== null}
      >
        {loading === "google" ? (
          <LoaderCircle className="size-5 animate-spin" />
        ) : (
          <span className="grid size-6 place-items-center rounded-full bg-white font-bold text-[#4285f4] shadow-sm">
            G
          </span>
        )}
        Continue with Google
      </Button>

      <div className="my-7 flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />
        <span className="text-sm text-muted-foreground">or continue with email</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleEmail} className="space-y-5">
        {signingUp && (
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Alex Morgan"
              autoComplete="name"
              className="h-13"
              required
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="h-13 pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {!signingUp && (
              <Link href="/forgot-password" className="text-xs font-medium hover:underline">
                Forgot password?
              </Link>
            )}
          </div>
          <div className="relative">
            <LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={signingUp ? "new-password" : "current-password"}
              minLength={8}
              className="h-13 px-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {signingUp && <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>}
        </div>

        <Button
          type="submit"
          size="lg"
          className="h-12 w-full rounded-md text-base font-semibold"
          disabled={loading !== null}
        >
          {loading === "email" && <LoaderCircle className="size-4 animate-spin" />}
          {signingUp ? "Create account" : "Sign in"}
          {!loading && signingUp && <ArrowRight className="size-4" />}
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-muted-foreground">
        {signingUp ? "Already have an account?" : "Don't have an account?"}{" "}
        <Link href={signingUp ? "/sign-in" : "/sign-up"} className="font-semibold hover:underline">
          {signingUp ? "Sign in" : "Create one"}
        </Link>
      </p>
    </div>
  );
}
