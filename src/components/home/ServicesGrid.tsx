import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Container } from "@/components/ui/Container";
import {
  SERVICE_CATEGORIES,
  localized,
} from "@/lib/services";
import { CATEGORY_IMAGES } from "@/lib/service-images";
import {
  ArrowRight,
} from "lucide-react";

export function ServicesGrid() {
  const t = useTranslations("services");
  const locale = useLocale();

  const sortedCategories = [...SERVICE_CATEGORIES].sort(
    (a, b) => a.order - b.order
  );

  return (
    <section className="bg-surface py-16 md:py-20">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-accent">
            <span className="inline-block h-0.5 w-6 bg-accent" />
            {t("sectionLabel")}
          </span>
          <h2 className="mt-3 font-display text-3xl font-extrabold text-primary md:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg text-ink/60">{t("subtitle")}</p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedCategories.map((category) => {
            return (
              <a
                key={category.slug}
                href={`/${locale}/uslugi#${category.slug}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-primary/20 bg-white shadow-md transition-all hover:-translate-y-1 hover:border-accent hover:shadow-xl"
              >
                <div className="relative overflow-hidden bg-primary px-8 py-6">
                  {/* TODO: replace with authentic photos */}
                  {CATEGORY_IMAGES[category.slug] && (
                    <Image
                      src={CATEGORY_IMAGES[category.slug].src}
                      alt={CATEGORY_IMAGES[category.slug].alt[locale] ?? CATEGORY_IMAGES[category.slug].alt.pl}
                      width={800}
                      height={300}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
                      className="absolute inset-0 h-full w-full object-cover opacity-40"
                      loading="lazy"
                    />
                  )}
                  <h3 className="relative z-10 font-display text-xl font-extrabold text-white">
                    {localized(category.title, locale)}
                  </h3>
                </div>
                <div className="flex flex-1 flex-col px-8 pb-8 pt-5">
                  <p className="text-sm leading-relaxed text-ink/60">
                    {localized(category.description, locale)}
                  </p>
                  <ul className="mt-5 flex-1 space-y-1.5 text-sm text-primary/70">
                    {category.services.map((s) => (
                      <li key={s.slug} className="flex items-start gap-2">
                        <span className="mt-2 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-accent" />
                        <span>{localized(s.title, locale)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-accent transition-transform group-hover:translate-x-1">
                    {t("viewDetails")}
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <a href={`/${locale}/uslugi`} className="inline-flex items-center gap-2 rounded-md border border-primary/20 bg-white px-6 py-3 text-base font-medium text-primary transition-colors hover:bg-primary/5">
            {t("viewAll")}
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </Container>
    </section>
  );
}
