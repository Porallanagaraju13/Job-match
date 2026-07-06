export type PlanCode = "free" | "pro" | "power";

export type Plan = {
  code: PlanCode;
  name: string;
  description: string;
  monthlyPrice: number;
  priceId?: string;
  featured?: boolean;
  badge?: string;
  jobResults: string;
  assistedApplications: string;
  features: string[];
};

export const plans: Plan[] = [
  {
    code: "free",
    name: "Free",
    description: "Start with a focused shortlist and a calmer job search.",
    monthlyPrice: 0,
    jobResults: "Top 10 matches daily",
    assistedApplications: "3 assisted applications / month",
    features: ["Resume profile", "Saved jobs", "Application tracker", "Community support"],
  },
  {
    code: "pro",
    name: "Pro",
    description: "For an active search with more matches and application help.",
    monthlyPrice: 19,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    featured: true,
    badge: "Most popular",
    jobResults: "All matching jobs",
    assistedApplications: "30 assisted applications / month",
    features: ["Everything in Free", "Priority processing", "Full match insights", "Email support"],
  },
  {
    code: "power",
    name: "Power",
    description: "A high-volume plan with fair-use protection and priority.",
    monthlyPrice: 49,
    priceId: process.env.STRIPE_POWER_PRICE_ID,
    badge: "For power users",
    jobResults: "All matching jobs",
    assistedApplications: "100 assisted applications / month",
    features: ["Everything in Pro", "Fastest processing", "Advanced filters", "Priority support"],
  },
];
