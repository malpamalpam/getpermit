import { setRequestLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/routing";
import { ContactForm } from "@/components/forms/ContactForm";
import {
  Briefcase,
  FileCheck,
  Shield,
  Bell,
  Building2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "employers" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    openGraph: {
      images: [
        {
          url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80",
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function EmployersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employers");

  const services = [
    { icon: FileCheck, key: "workPermits" },
    { icon: Briefcase, key: "declarations" },
    { icon: Shield, key: "audit" },
    { icon: Bell, key: "notifications" },
    { icon: Building2, key: "b2bIncubator" },
  ];

  const benefits = ["benefit1", "benefit2", "benefit3", "benefit4", "benefit5"];

  return (
    <article>
      {/* Hero */}
      <div className="relative overflow-hidden bg-primary">
        <Image
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1440&q=80"
          alt={t("heroAlt")}
          width={1440}
          height={480}
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          priority
          sizes="100vw"
        />
        <div className="relative z-10 py-16 md:py-24">
          <Container>
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                <Briefcase className="h-3.5 w-3.5" />
                B2B
              </span>
              <h1 className="mt-4 font-display text-4xl font-bold text-white md:text-5xl lg:text-6xl">
                {t("heroTitle")}
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-white/80 md:text-xl">
                {t("heroSubtitle")}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/kontakt">
                  <Button variant="accent" size="lg">
                    {t("ctaPrimary")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </Container>
        </div>
      </div>

      {/* Services grid */}
      <Container className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-extrabold text-primary md:text-4xl">
            {t("servicesTitle")}
          </h2>
          <p className="mt-4 text-lg text-ink/60">{t("servicesSubtitle")}</p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-primary">
                  {t(`services.${s.key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/65">
                  {t(`services.${s.key}.desc`)}
                </p>
              </div>
            );
          })}
        </div>
      </Container>

      {/* Benefits */}
      <div className="bg-surface py-16 md:py-24">
        <Container>
          <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-extrabold text-primary md:text-4xl">
                {t("benefitsTitle")}
              </h2>
              <p className="mt-4 text-lg text-ink/60">
                {t("benefitsSubtitle")}
              </p>
            </div>
            <ul className="space-y-4">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-6 w-6 flex-shrink-0 text-accent" />
                  <div>
                    <div className="font-display font-bold text-primary">
                      {t(`benefits.${b}.title`)}
                    </div>
                    <div className="mt-1 text-sm text-ink/65">
                      {t(`benefits.${b}.desc`)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </div>

      {/* Contact form */}
      <Container className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border-[3px] border-[#0a2540] bg-white p-8 shadow-[0_8px_24px_rgba(10,37,64,0.15)] md:p-12">
            <h2 className="font-display text-2xl font-bold text-primary md:text-3xl">
              {t("ctaTitle")}
            </h2>
            <p className="mt-3 text-base text-ink/65">{t("ctaSubtitle")}</p>
            <div className="mt-8">
              <ContactForm defaultService="dla-pracodawcow" />
            </div>
          </div>
        </div>
      </Container>

      {/* Schema.org */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: t("heroTitle"),
            description: t("heroSubtitle"),
            provider: {
              "@type": "Organization",
              name: "UTM Group Grzegorz St\u0119pie\u0144",
              url: "https://getpermit.pl",
            },
            areaServed: { "@type": "Country", name: "Poland" },
            audience: { "@type": "BusinessAudience", name: "Employers" },
          }),
        }}
      />
    </article>
  );
}
