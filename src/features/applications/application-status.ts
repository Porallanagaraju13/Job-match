import type { ApplicationState } from "@/lib/types";

export const applicationStatus: Record<
  ApplicationState,
  { label: string; description: string; className: string }
> = {
  draft: {
    label: "Draft",
    description: "Application started",
    className: "bg-zinc-100 text-zinc-700",
  },
  needs_input: {
    label: "Needs input",
    description: "A required answer is missing",
    className: "bg-amber-100 text-amber-800",
  },
  ready_for_review: {
    label: "Ready for review",
    description: "All required fields are mapped",
    className: "bg-violet-100 text-violet-800",
  },
  submitted: {
    label: "Submitted",
    description: "Confirmation captured",
    className: "bg-emerald-100 text-emerald-800",
  },
  interview: {
    label: "Interview",
    description: "Interview stage",
    className: "bg-blue-100 text-blue-800",
  },
  failed: {
    label: "Needs attention",
    description: "The last attempt could not complete",
    className: "bg-red-100 text-red-800",
  },
};
