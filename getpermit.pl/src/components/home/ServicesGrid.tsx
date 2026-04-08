import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import {
  SERVICE_CATEGORIES,
  localized,
  type ServiceCategoryIcon,
} from "@/lib/services";
import {
  Briefcase,
  Home,
  MapPin,
  Scale,
  Languages,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_ICONS: Record<ServiceCategoryIcon, LucideIcon> = {
  Briefcase,
  Home,
  MapPin,
  Scale,
  Languages,
};

export function ServicesGrid() {
  const t = useTranslations("services");
  const locale = useLocale();

  const sortedCategories = [...SERVICE_CATEGORIES].sort(
    (a, b) => a.order - b.order
  );

  return (
    <section className="bg-surface py-20 md:py-28">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-accent">
            <span className="inline-block h-0.5 w-6 bg-accent" />
            Oferta
          </span>
          <h2 className="mt-3 font-display text-3xl font-extrabold text-primary md:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg text-ink/60">{t("subtitle")}</p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedCategories.map((category) => {
            const Icon = CATEGORY_ICONS[category.icon];
            return (
              <Link
                key={category.slug}
                href={{
                  pathname: "/uslugi",
                }}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-primary/10 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg"
              >
                <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Icon className="h-7 w-7" strokeWidth={2} />
                </div>
                <h3 className="font-display text-xl font-bold text-primary">
                  {localized(category.title, locale)}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/60">
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
              </Link>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Link href="/uslugi">
            <Button variant="outline" size="lg">
              {t("viewAll")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </Container>
    </section>
  );
}
