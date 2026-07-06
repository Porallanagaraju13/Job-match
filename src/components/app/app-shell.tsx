"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bookmark,
  BriefcaseBusiness,
  CreditCard,
  FileText,
  LogOut,
  Menu,
  PanelLeft,
  Settings,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FirstRunResumeDialog } from "@/components/app/first-run-resume-dialog";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const primaryNav: Array<{ label: string; href: string; icon: LucideIcon }> = [
  { label: "Jobs", href: "/app/jobs", icon: BriefcaseBusiness },
  { label: "Saved Jobs", href: "/app/saved", icon: Bookmark },
  { label: "Resume", href: "/app/resume", icon: FileText },
  { label: "Profile", href: "/app/profile", icon: UserRound },
  { label: "Application Status", href: "/app/applications", icon: BarChart3 },
];

const pageTitles: Record<string, string> = {
  "/app/jobs": "Jobs",
  "/app/saved": "Saved Jobs",
  "/app/resume": "Resume",
  "/app/profile": "Profile",
  "/app/applications": "Application Status",
  "/app/billing": "Billing & Subscription",
  "/app/settings": "Profile Settings",
};

function activePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <nav className="space-y-2" aria-label="Dashboard navigation">
      {primaryNav.map((item) => {
        const active = activePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-emerald-50 text-emerald-800"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            )}
          >
            <item.icon className="size-[18px]" strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({
  pathname,
  dailyUsed,
  dailyLimit,
}: {
  pathname: string;
  dailyUsed: number;
  dailyLimit: number;
}) {
  const remaining = Math.max(0, dailyLimit - dailyUsed);
  return (
    <div className="flex h-full flex-col">
      <Link href="/app/jobs" className="px-1">
        <BrandMark />
      </Link>

      <div className="mt-9">
        <NavLinks pathname={pathname} />
      </div>

      <div className="mt-auto space-y-4">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Daily applies</p>
              <p className="mt-1 text-xl font-bold">
                {remaining} <span className="text-sm font-medium text-muted-foreground">/ {dailyLimit}</span>
              </p>
            </div>
            <span className="grid size-10 place-items-center rounded-md border border-emerald-200 bg-white text-emerald-700">
              <FileText className="size-5" />
            </span>
          </div>
          <Progress value={(dailyUsed / dailyLimit) * 100} className="mt-4 h-1.5" />
          <p className="mt-3 text-xs text-muted-foreground">
            {dailyUsed} / {dailyLimit} used today
          </p>
        </div>

        <div className="space-y-1 border-t pt-3">
          <Link
            href="/app/billing"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
          >
            <CreditCard className="size-[18px]" />
            Billing & Subscription
          </Link>
          <Link
            href="/app/settings"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
          >
            <Settings className="size-[18px]" />
            Profile Settings
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  userName,
  userEmail,
  needsResume,
  dailyUsed,
  dailyLimit,
}: {
  children: ReactNode;
  userName: string;
  userEmail: string;
  needsResume: boolean;
  dailyUsed: number;
  dailyLimit: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const pageTitle =
    Object.entries(pageTitles).find(([path]) => activePath(pathname, path))?.[1] ?? "JobMatch";

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] border-r bg-white p-4 lg:block">
        <SidebarContent pathname={pathname} dailyUsed={dailyUsed} dailyLimit={dailyLimit} />
      </aside>

      <div className="lg:pl-[280px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur sm:px-7">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger render={<Button variant="outline" size="icon" className="lg:hidden" />}>
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-[290px] p-4">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation</SheetTitle>
                  <SheetDescription>JobMatch navigation</SheetDescription>
                </SheetHeader>
                <SidebarContent pathname={pathname} dailyUsed={dailyUsed} dailyLimit={dailyLimit} />
              </SheetContent>
            </Sheet>
            <PanelLeft className="hidden size-4 text-muted-foreground lg:block" />
            <span className="font-semibold text-slate-900">{pageTitle}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-sm font-semibold">{userName || "Job seeker"}</span>
              <span className="block text-[11px] text-muted-foreground">{userEmail}</span>
            </span>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="size-4 sm:hidden" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>

        <main>
          <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-[1500px] p-4 sm:p-7 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      <FirstRunResumeDialog open={needsResume} />
    </div>
  );
}
