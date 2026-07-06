"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, LogOut } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const steps = [
  { label: "Resume", href: "/onboarding/resume" },
  { label: "Review profile", href: "/onboarding/review" },
  { label: "Preferences", href: "/onboarding/preferences" },
];

export function OnboardingShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => pathname.startsWith(step.href)),
  );

  return (
    <div className="min-h-screen bg-[#f7f6f2]">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/">
            <BrandMark />
          </Link>
          <Button render={<Link href="/sign-in" />} variant="ghost">
            <LogOut className="size-4" />
            Save & exit
          </Button>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <div className="mx-auto mb-8 flex max-w-2xl items-center">
          {steps.map((step, index) => {
            const complete = index < activeIndex;
            const active = index === activeIndex;
            return (
              <div key={step.href} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-2">
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-full border text-xs font-bold",
                      complete && "border-emerald-600 bg-emerald-600 text-white",
                      active && "border-primary bg-primary text-primary-foreground",
                      !complete && !active && "bg-card text-muted-foreground",
                    )}
                  >
                    {complete ? <Check className="size-4" /> : index + 1}
                  </span>
                  <span
                    className={cn(
                      "whitespace-nowrap text-xs font-medium",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <span className={cn("mx-3 mb-5 h-px flex-1", index < activeIndex ? "bg-emerald-500" : "bg-border")} />
                )}
              </div>
            );
          })}
        </div>
        {children}
      </div>
    </div>
  );
}
