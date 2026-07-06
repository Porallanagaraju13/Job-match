import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="relative hidden border-r bg-slate-950 p-12 text-white lg:flex lg:flex-col xl:p-16">
        <Link href="/" className="flex w-fit items-center gap-3">
          <BrandMark inverted />
        </Link>

        <div className="my-auto max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Job search workspace
          </p>
          <h2 className="mt-5 font-heading text-4xl font-semibold tracking-[-0.035em]">
            Manage your applications with clarity.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            Keep roles, resumes, saved jobs, and application status in one organized place.
          </p>
          <div className="mt-10 grid gap-3 text-sm text-slate-300">
            <span className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
              Job matches from selected platforms
            </span>
            <span className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
              Resume and profile data kept structured
            </span>
            <span className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
              Application progress tracked in one view
            </span>
          </div>
        </div>

        <p className="text-sm text-slate-500">Professional job search management</p>
      </aside>

      <main className="relative flex items-center justify-center px-6 py-12 sm:px-10">
        <Link href="/" className="absolute left-6 top-6 flex items-center gap-2 lg:hidden">
          <BrandMark />
        </Link>
        <div className="w-full max-w-[460px]">{children}</div>
      </main>
    </div>
  );
}
