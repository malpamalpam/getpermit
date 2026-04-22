import { useTranslations, useLocale } from "next-intl";
import { Container } from "@/components/ui/Container";
import {
  SERVICE_CATEGORIES,
  localized,
} from "@/lib/services";
import { SERVICE_BASE_PATH, getLocalizedSlug } from "@/lib/service-slugs";
import { ArrowRight, Users, Briefcase } from "lucide-react";

export function ServicesGrid() {
  const t = useTranslations("services");
  const locale = useLocale();
  const base = SERVICE_BASE_PATH[locale] ?? "uslugi";

  const foreignerCategories = SERVICE_CATEGORIES
    .filter((c) => c.slug !== "dla-pracodawcow")
    .sort((a, b) => a.order - b.order);

  const employerCategory = SERVICE_CATEGORIES.find(
    (c) => c.slug === "dla-pracodawcow"
  );

  const boxes = [
    {
      id: "cudzoziemcy",
      icon: Users,
      label: t("forForeigners"),
      href: `/${locale}/${base}`,
      items: foreignerCategories.map((c) => localized(c.title, locale)),
    },
    ...(employerCategory
      ? [
          {
            id: "pracodawcy",
            icon: Briefcase,
            label: t("forEmployers"),
            href: `/${locale}/${base}/${getLocalizedSlug("dla-pracodawcow", locale)}`,
            items: employerCategory.services.map((s) => localized(s.title, locale)),
          },
        ]
      : []),
  ];

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

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          {boxes.map((box) => (
            <a
              key={box.id}
              id={box.id}
              href={box.href}
              className="group flex flex-col rounded-2xl border-2 border-primary/20 bg-white p-8 shadow-md transition-all hover:-translate-y-1 hover:border-accent hover:shadow-xl scroll-mt-24"
            >
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <box.icon className="h-7 w-7" />
              </div>
              <h3 className="font-display text-2xl font-extrabold text-primary">
                {box.label}
              </h3>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-primary/70">
                {box.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-2 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-accent transition-transform group-hover:translate-x-1">
                {t("viewDetails")}
                <ArrowRight className="h-4 w-4" />
              </div>
            </a>
          ))}
        </div>
      </Container>
    </section>
  );
}
