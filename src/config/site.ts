export const siteConfig = {
  name: "JobMatch",
  shortName: "JobMatch",
  description:
    "A thoughtful AI job-search copilot that helps people find, organize, and apply to better-fit roles.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supportEmail: "support@jobmatch.ai",
} as const;

export const marketingNav = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Trust", href: "/#trust" },
] as const;
