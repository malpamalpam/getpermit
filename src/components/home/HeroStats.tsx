"use client";

import { AnimatedCounter } from "./AnimatedCounter";

interface StatItem {
  target: number;
  suffix: string;
  label: string;
}

interface Props {
  stats: StatItem[];
}

export function HeroStats({ stats }: Props) {
  return (
    <div className="mt-10 flex items-center gap-6 md:gap-10">
      {stats.map((stat, i) => (
        <div key={i} className="flex items-center gap-6 md:gap-10">
          {i > 0 && (
            <div className="h-10 w-px bg-white/20" aria-hidden="true" />
          )}
          <div>
            <div className="font-display text-2xl font-extrabold text-white md:text-3xl">
              <AnimatedCounter target={stat.target} suffix={stat.suffix} />
            </div>
            <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
              {stat.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
