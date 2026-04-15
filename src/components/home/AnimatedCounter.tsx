"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  target: number;
  suffix?: string;
  duration?: number;
}

export function AnimatedCounter({ target, suffix = "", duration = 2000 }: Props) {
  // SSR: renderuj docelową wartość, JS nadpisze animacją
  const [count, setCount] = useState(target);
  const [started, setStarted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Po hydratacji resetuj do 0 żeby animacja mogła startować
  useEffect(() => {
    setHydrated(true);
    setCount(0);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !hydrated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [started, hydrated]);

  useEffect(() => {
    if (!started) return;

    const steps = 60;
    const stepDuration = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current++;
      const progress = current / steps;
      // ease-out curve
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));

      if (current >= steps) {
        setCount(target);
        clearInterval(timer);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [started, target, duration]);

  return (
    <span ref={ref} suppressHydrationWarning>
      {count.toLocaleString("pl-PL")}{suffix}
    </span>
  );
}
