import { cn } from "@/lib/utils";

type BrandMarkProps = {
  compact?: boolean;
  className?: string;
  inverted?: boolean;
};

export function BrandMark({ compact = false, className, inverted = false }: BrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* SVG icon mark — emerald gradient briefcase with spark */}
      <span
        aria-hidden="true"
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-[10px]",
          inverted
            ? "bg-white/10 ring-1 ring-white/20"
            : "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-[0_1px_8px_rgba(16,185,129,0.35)]",
        )}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Briefcase body */}
          <rect x="2" y="7" width="16" height="11" rx="2.5" fill="white" fillOpacity="0.9" />
          {/* Briefcase handle */}
          <path
            d="M7 7V5.5A1.5 1.5 0 0 1 8.5 4h3A1.5 1.5 0 0 1 13 5.5V7"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Center clasp line */}
          <path d="M2 11h16" stroke="white" strokeOpacity="0.4" strokeWidth="1" />
          {/* Spark / AI dot */}
          <circle cx="15.5" cy="5.5" r="2" fill="white" fillOpacity="0.95" />
          <path
            d="M15.5 4.2v.6M15.5 6.2v.6M14.2 5.5h.6M16.2 5.5h.6"
            stroke="rgba(5,150,105,0.9)"
            strokeWidth="0.7"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {!compact && (
        <span
          className={cn(
            "font-heading text-[17px] font-bold tracking-[-0.03em]",
            inverted ? "text-white" : "text-slate-950",
          )}
        >
          Job<span className={inverted ? "text-white/70" : "text-emerald-600"}>Match</span>
        </span>
      )}
    </div>
  );
}

