import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { ServiceCard } from "@/components/services/ServiceCard";
import {
  getServiceCategories,
  localized,
  type ServiceCategoryIcon,
} from "@/lib/services";
import { getLocalizedCategorySlug, getLocalizedSlug, SERVICE_BASE_PATH } from "@/lib/service-slugs";
import { Link } from "@/i18n/routing";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "services" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("services");
  const categories = await getServiceCategories();

  return (
    <div className="bg-surface py-16 md:py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-4xl font-bold text-primary md:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-lg text-primary/70">{t("subtitle")}</p>
        </div>

        <div className="mt-16 space-y-20">
          {categories.map((category) => {
            const Icon = CATEGORY_ICONS[category.icon];
            return (
              <section key={category.slug} id={getLocalizedCategorySlug(category.slug, locale)}>
                <div className="mb-8 flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                    <Icon className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-extrabold text-primary md:text-3xl">
                      {localized(category.title, locale)}
                    </h2>
                    <p className="mt-2 max-w-2xl text-base text-ink/60">
                      {localized(category.description, locale)}
                    </p>
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {category.services.map((service) => (
                    <ServiceCard key={service.slug} service={service} />
                  ))}
                </div>
                {category.slug === "dla-pracodawcow" && (
                  <div className="mt-6">
                    <a
                      href={`/${locale}/${SERVICE_BASE_PATH[locale] ?? "uslugi"}/${getLocalizedSlug("dla-pracodawcow", locale)}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      {localized(category.title, locale)} \u2014 {t("viewDetails")}
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </Container>
    </div>
  );
}
