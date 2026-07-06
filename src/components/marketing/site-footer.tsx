import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";

const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Trust",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
      { label: "Security", href: "/#trust" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-card" aria-label="Site footer">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        {/* Brand column */}
        <div>
          <BrandMark />
          <p className="mt-4 max-w-[280px] text-sm leading-6 text-muted-foreground">
            A thoughtful job-search copilot that keeps you informed, in control,
            and focused on roles worth your time.
          </p>
          {/* Developer credibility stack note */}
          <p className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-emerald-500" />
            Built with Next.js · Supabase · TypeScript
          </p>
        </div>

        {/* Link groups */}
        {footerLinks.map((group) => (
          <div key={group.title}>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-foreground/60">
              {group.title}
            </p>
            <nav aria-label={`${group.title} links`} className="mt-4 flex flex-col gap-3">
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} JobMatch. Built for thoughtful job seekers.</p>
          <p className="font-medium text-muted-foreground/60">AI assists. You stay in control.</p>
        </div>
      </div>
    </footer>
  );
}

