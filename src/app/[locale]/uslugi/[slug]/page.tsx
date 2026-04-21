import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/routing";
import { ContactForm } from "@/components/forms/ContactForm";
import {
  getServiceBySlug,
  getServiceCategoryBySlug,
  getAllServices,
  localized,
  localizedList,
} from "@/lib/services";
import { routing } from "@/i18n/routing";
import Image from "next/image";
import { getServiceHeroImage } from "@/lib/service-images";
import { getLocalizedSlug, resolveInternalSlug } from "@/lib/service-slugs";
import {
  Wallet,
  CheckCircle2,
  ChevronRight,
  Users,
  ArrowLeft,
} from "lucide-react";

export async function generateStaticParams() {
  const services = await getAllServices();
  return routing.locales.flatMap((locale) =>
    services.map((s) => ({ locale, slug: getLocalizedSlug(s.slug, locale) }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const internalSlug = resolveInternalSlug(slug, locale);
  const service = await getServiceBySlug(internalSlug);
  if (!service) return {};
  const heroImg = getServiceHeroImage(internalSlug);
  return {
    title: localized(service.title, locale),
    description: localized(service.shortDescription, locale),
    openGraph: {
      images: [{ url: heroImg.src, width: 1440, height: 480 }],
    },
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const internalSlug = resolveInternalSlug(slug, locale);
  const service = await getServiceBySlug(internalSlug);
  if (!service) notFound();

  const category = await getServiceCategoryBySlug(service.categorySlug);

  const t = await getTranslations("services");
  const tNav = await getTranslations("nav");

  const title = localized(service.title, locale);
  const shortDesc = localized(service.shortDescription, locale);
  const fullDesc = localized(service.fullDescription, locale);
  const forWhom = localized(service.forWhom, locale);
  const documents = localizedList(service.requiredDocuments, locale);
  // TODO: replace Unsplash URLs with authentic photos in /public/images/services/
  const heroImage = getServiceHeroImage(service.slug);
  const heroAlt = heroImage.alt[locale] ?? heroImage.alt.pl;

  return (
    <article>
      {/* Hero with image */}
      <div className="relative overflow-hidden bg-primary">
        <Image
          src={heroImage.src}
          alt={heroAlt}
          width={1440}
          height={480}
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          priority
          sizes="100vw"
          fetchPriority="high"
        />
        <div className="relative z-10 py-16 md:py-20">
          <Container>
            <nav
              aria-label="Breadcrumb"
              className="mb-6 flex items-center gap-2 text-sm text-white/60"
            >
              <Link href="/" className="hover:text-white">
                {tNav("home")}
              </Link>
              <ChevronRight className="h-4 w-4" />
              <Link href="/uslugi" className="hover:text-white">
                {tNav("services")}
              </Link>
              {category && (
                <>
                  <ChevronRight className="h-4 w-4" />
                  <Link
                    href={{
                      pathname: "/uslugi",
                    }}
                    className="hover:text-white"
                  >
                    {localized(category.title, locale)}
                  </Link>
                </>
              )}
              <ChevronRight className="h-4 w-4" />
              <span className="text-white">{title}</span>
            </nav>

            <h1 className="font-display text-4xl font-bold text-white md:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-white/80">{shortDesc}</p>

            <div className="mt-8 flex flex-wrap gap-4">
              {service.price && (
                <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
                  <Wallet className="h-5 w-5 text-brand" />
                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/60">
                      {t("price")}
                    </div>
                    <div className="font-semibold text-white">
                      {service.price}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Container>
        </div>
      </div>

      {/* Body */}
      <Container className="py-16">
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {/* Full description */}
            <section className="prose-content">
              <p className="text-base leading-relaxed text-primary/80">
                {fullDesc}
              </p>
            </section>

            {/* For whom */}
            <section className="mt-10 rounded-xl border border-primary/10 bg-surface p-6 md:p-8">
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-6 w-6 flex-shrink-0 text-accent" />
                <div>
                  <h2 className="font-display text-xl font-bold text-primary">
                    {t("forWhom")}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-primary/70">
                    {forWhom}
                  </p>
                </div>
              </div>
            </section>

            {/* Documents */}
            {documents.length > 0 && (
              <section className="mt-10 rounded-xl border border-primary/10 bg-surface p-6 md:p-8">
                <h2 className="mb-4 font-display text-xl font-bold text-primary">
                  {t("documents")}
                </h2>
                <ul className="space-y-3">
                  {documents.map((doc, i) => (
                    <li key={i} className="flex gap-3 text-sm text-primary/80">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent" />
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-12">
              <Link href="/uslugi">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                  {tNav("services")}
                </Button>
              </Link>
            </div>
          </div>

          {/* Sidebar with form */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-xl border-[3px] border-[#0a2540] bg-white p-6 shadow-[0_8px_24px_rgba(10,37,64,0.15)]">
                <h3 className="font-display text-lg font-bold text-primary">
                  {tNav("consultation")}
                </h3>
                <p className="mt-2 text-sm text-primary/60">{t("subtitle")}</p>
                <div className="mt-6">
                  <ContactForm defaultService={service.slug} compact />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </Container>

      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: title,
            description: shortDesc,
            provider: {
              "@type": "Organization",
              name: "UTM Group Grzegorz Stępień",
              url: "https://getpermit.pl",
            },
            areaServed: { "@type": "Country", name: "Poland" },
            image: {
              "@type": "ImageObject",
              url: heroImage.src,
              width: 1440,
              height: 480,
            },
          }),
        }}
      />
    </article>
  );
}
