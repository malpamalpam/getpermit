"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Menu, X, Phone } from "lucide-react";
import { BookingButton } from "@/components/booking/BookingButton";
import { siteConfig } from "@/config/site";
import { SERVICE_BASE_PATH } from "@/lib/service-slugs";

const SECTION_IDS = ["cudzoziemcy", "pracodawcy", "proces"] as const;

export function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const locale = useLocale();
  const onHome = pathname === "/";

  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  // Track which section is currently in view (homepage only)
  useEffect(() => {
    if (!onHome) {
      setActive(null);
      return;
    }
    const observers: IntersectionObserver[] = [];
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        // section is "active" once it crosses upper-mid of viewport
        { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [onHome]);

  // Zlokalizowane ID kotwic na homepage
  const SECTION_ANCHORS: Record<string, Record<string, string>> = {
    cudzoziemcy: { pl: "cudzoziemcy", en: "cudzoziemcy", ru: "cudzoziemcy", uk: "cudzoziemcy" },
    pracodawcy: { pl: "pracodawcy", en: "pracodawcy", ru: "pracodawcy", uk: "pracodawcy" },
    proces: { pl: "proces", en: "process", ru: "process", uk: "process" },
  };

  const sectionHref = (id: string) => {
    const anchor = SECTION_ANCHORS[id]?.[locale] ?? id;
    return onHome ? `#${anchor}` : `/${locale}/#${anchor}`;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <Container>
        <div className="flex h-16 items-center justify-between md:h-20">
          {/* Logo */}
          <Link
            href="/"
            className="flex flex-shrink-0 items-center gap-3 text-primary"
            aria-label="getpermit.pl"
          >
            <Image
              src="/logo.svg"
              alt="getpermit.pl — karta pobytu i zezwolenie na pracę w Polsce"
              width={48}
              height={32}
              priority
              className="h-7 w-auto md:h-9"
            />
            <span className="font-display text-xl font-bold tracking-tight text-primary md:text-2xl">
              get<span className="text-brand">permit</span>.pl
            </span>
          </Link>

          {/* Desktop nav — visible from lg to avoid overflow with longer translations (RU/UK) */}
          <nav className="hidden items-center gap-4 xl:gap-6 lg:flex mx-6 xl:mx-10">
            {SECTION_IDS.map((id) => {
              const isActive = active === id;
              return (
                <a
                  key={id}
                  href={sectionHref(id)}
                  className={`relative whitespace-nowrap text-[13px] xl:text-sm font-medium transition-colors ${
                    isActive
                      ? "text-primary"
                      : "text-primary/70 hover:text-primary"
                  }`}
                >
                  {t(`section_${id}`)}
                  <span
                    className={`absolute -bottom-1.5 left-0 h-0.5 bg-accent transition-all duration-300 ${
                      isActive ? "w-full" : "w-0"
                    }`}
                  />
                </a>
              );
            })}
            <Link
              href="/blog"
              className="whitespace-nowrap text-[13px] xl:text-sm font-medium text-primary/70 transition-colors hover:text-primary"
            >
              {t("blog")}
            </Link>
          </nav>

          <div className="hidden flex-shrink-0 items-center gap-3 lg:flex">
            <a
              href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary/70 transition-colors hover:text-accent"
              title="Pon–Pt 9:00–17:00"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>{siteConfig.contact.phone}</span>
            </a>
            <div className="h-5 w-px bg-primary/10" />
            <LanguageSwitcher />
            <BookingButton variant="primary" size="sm">
              {t("consultation")}
            </BookingButton>
            <a
              href={`/panel/login?lang=${locale}`}
              className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md border border-primary/20 bg-primary/5 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              {t("clientPanel")}
            </a>
          </div>

          {/* Mobile toggle — visible on md and below (desktop nav starts at lg) */}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-primary lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={t("menuToggle")}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-primary/10 py-4 lg:hidden">
            <nav className="flex flex-col gap-4">
              {SECTION_IDS.map((id) => (
                <a
                  key={id}
                  href={sectionHref(id)}
                  className="text-base font-medium text-primary"
                  onClick={() => setMobileOpen(false)}
                >
                  {t(`section_${id}`)}
                </a>
              ))}
              <Link
                href="/blog"
                className="text-base font-medium text-primary"
                onClick={() => setMobileOpen(false)}
              >
                {t("blog")}
              </Link>
              {/* Phone number — mobile */}
              <a
                href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-accent"
              >
                <Phone className="h-4 w-4" />
                {siteConfig.contact.phone}
                <span className="text-xs font-normal text-primary/40">Pon–Pt 9:00–17:00</span>
              </a>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-primary/10 pt-4">
                <LanguageSwitcher />
                <div className="flex items-center gap-2">
                  <BookingButton variant="primary" size="sm">
                    {t("consultation")}
                  </BookingButton>
                  <a
                    href={`/panel/login?lang=${locale}`}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t("clientPanel")}
                  </a>
                </div>
              </div>
            </nav>
          </div>
        )}
      </Container>
    </header>
  );
}
