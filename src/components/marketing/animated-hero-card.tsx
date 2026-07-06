"use client";

import React, { useRef, useState } from "react";
import gsap from "gsap";
import { ArrowUpRight, BriefcaseBusiness, CheckCircle2, Gauge, ShieldCheck } from "lucide-react";
import type { Job } from "@/lib/types";

interface AnimatedHeroCardProps {
  jobs: Job[];
}

export function AnimatedHeroCard({ jobs }: AnimatedHeroCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [activeJobIndex, setActiveJobIndex] = useState(0);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -12;
    const rotateY = ((x - centerX) / centerX) * 12;

    gsap.to(cardRef.current, {
      rotateX: rotateX,
      rotateY: rotateY,
      duration: 0.5,
      ease: "power2.out",
    });
  }

  function handleMouseLeave() {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, {
      rotateX: 6,
      rotateY: -8,
      duration: 0.8,
      ease: "power3.out",
    });
  }

  const activeJob = jobs[activeJobIndex] || jobs[0];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="perspective-1000 relative w-full max-w-2xl mx-auto py-6 px-2 sm:px-4 cursor-pointer select-none"
    >
      {/* Main 3D Card Container */}
      <div
        ref={cardRef}
        style={{ transform: "rotateX(6deg) rotateY(-8deg)" }}
        className="preserve-3d glass-card rounded-xl p-5 sm:p-7 transition-colors duration-200 relative border"
      >
        {/* Top Header Layer */}
        <div className="flex items-center justify-between pb-4 border-b border-border/40 translate-z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg border border-emerald-200 bg-emerald-50 flex items-center justify-center text-emerald-700">
              <BriefcaseBusiness className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm sm:text-base text-foreground">
                  JobMatch workspace
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Updated
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Reviewing job matches and applications</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg border border-border/50">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Review required
          </div>
        </div>

        {/* Floating summary badge */}
        <div 
          className="absolute -top-4 -right-4 border bg-card text-foreground text-xs font-medium px-3.5 py-1.5 rounded-lg flex items-center gap-1.5"
          style={{ transform: "translateZ(30px)" }}
        >
          <Gauge className="w-3.5 h-3.5 text-emerald-600" />
          <span>98% profile fit</span>
        </div>

        {/* Middle Interactive Content */}
        <div className="py-5 space-y-4">
          {/* Job Selection Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {jobs.map((job, idx) => (
              <button
                key={job.id}
                onClick={() => setActiveJobIndex(idx)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap border ${
                  activeJobIndex === idx
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background/60 hover:bg-muted text-muted-foreground border-border/50"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-current opacity-70" />
                {job.company}
              </button>
            ))}
          </div>

          {/* Active Job Preview Box with Glass Depth */}
          {activeJob && (
            <div 
              className="rounded-xl bg-background/50 border border-border/60 p-4 space-y-3 shadow-inner transition-all duration-300"
              style={{ transform: "translateZ(15px)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-foreground text-base sm:text-lg">
                    {activeJob.title}
                  </h4>
                  <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>{activeJob.company}</span>
                    <span>•</span>
                    <span>{activeJob.location}</span>
                    <span>•</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      {activeJob.salary}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    {activeJob.matchScore}% Match
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {activeJob.postedLabel}
                  </span>
                </div>
              </div>

              {/* Match Reasons Badges */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeJob.matchReasons.map((reason, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[11px] bg-muted/80 text-muted-foreground px-2 py-0.5 rounded-md border border-border/40"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Prepared application summary */}
          <div 
            className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15"
            style={{ transform: "translateZ(20px)" }}
          >
            <div className="flex items-center gap-2.5">
              <BriefcaseBusiness className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium text-foreground">
                Application details ready for review
              </span>
            </div>
            <button className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1">
              Preview
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
