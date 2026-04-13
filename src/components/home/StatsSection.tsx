"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/config/site";

function useCountUp(target: number, durationMs = 1600, start = false) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const startTs = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTs) / durationMs, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, start]);

  return value;
}

function StatItem({
  target,
  suffix,
  label,
  start,
}: {
  target: number;
  suffix?: string;
  label: string;
  start: boolean;
}) {
  const value = useCountUp(target, 1600, start);
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-primary/10 bg-surface px-6 py-8 text-center">
      <div className="font-display text-4xl font-extrabold text-primary md:text-5xl">
        {value.toLocaleString("pl-PL")}
        {suffix && <span className="text-accent">{suffix}</span>}
      </div>
      <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-ink/55">
        {label}
      </div>
    </div>
  );
}

export function StatsSection() {
  const t = useTranslations("stats");
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const items = [
    { value: siteConfig.stats.yearsOfExperience, suffix: "+", label: t("years") },
    { value: siteConfig.stats.clientsServed, suffix: "+", label: t("clients") },
    { value: siteConfig.stats.successRate, suffix: "%", label: t("success") },
  ];

  return (
    <section className="bg-white py-12">
      <Container>
        <div ref={ref} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {items.map((item, i) => (
            <StatItem
              key={i}
              target={item.value}
              suffix={item.suffix}
              label={item.label}
              start={inView}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
