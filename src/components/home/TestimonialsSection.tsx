"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { Quote, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, useEffect, useCallback } from "react";

const TESTIMONIAL_KEYS = [
  "olena", "aleksey", "rajesh", "liu", "fatih",
  "nguyen", "anna", "dmitriy", "priya", "irina",
] as const;

export function TestimonialsSection() {
  const t = useTranslations("testimonials");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [checkScroll]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 340;
    el.scrollBy({ left: dir === "left" ? -cardWidth : cardWidth, behavior: "smooth" });
  };

  return (
    <section className="bg-white py-20 md:py-28">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-accent">
            <span className="inline-block h-0.5 w-6 bg-accent" />
            {t("label")}
          </span>
          <h2 className="mt-3 font-display text-3xl font-extrabold text-primary md:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg text-ink/60">{t("subtitle")}</p>

          {/* Google Reviews badge */}
          <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-primary/10 bg-surface px-5 py-2.5 shadow-sm">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-primary">4.8</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
            <span className="text-xs text-primary/50">{t("googleReviews")}</span>
          </div>
        </div>

        {/* Carousel controls */}
        <div className="mt-10 flex items-center justify-end gap-2 mb-4">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="rounded-full border border-primary/10 p-2 transition-colors hover:bg-primary/5 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Poprzednie opinie"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="rounded-full border border-primary/10 p-2 transition-colors hover:bg-primary/5 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Następne opinie"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable carousel */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {TESTIMONIAL_KEYS.map((key) => (
            <figure
              key={key}
              className="relative flex w-[320px] flex-shrink-0 snap-start flex-col rounded-2xl border border-primary/10 bg-surface p-8 transition-all hover:border-accent hover:shadow-[0_8px_30px_rgba(37,99,235,0.08)]"
            >
              <Quote
                className="absolute right-6 top-6 h-8 w-8 text-accent/20"
                aria-hidden="true"
              />
              <div className="mb-4 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className="h-4 w-4 fill-accent text-accent"
                  />
                ))}
              </div>
              <blockquote className="flex-1 text-sm italic leading-relaxed text-ink/70">
                &bdquo;{t(`items.${key}.quote`)}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-primary/10 pt-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {t(`items.${key}.name`).split(" ").map((p: string) => p[0]).join("")}
                </div>
                <div>
                  <div className="text-sm font-semibold text-primary">
                    {t(`items.${key}.name`)}
                  </div>
                  <div className="text-xs text-ink/45">{t(`items.${key}.role`)}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}
