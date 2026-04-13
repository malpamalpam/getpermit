import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { siteConfig } from "@/config/site";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  const OG_LOCALES: Record<string, string> = {
    pl: "pl_PL", en: "en_US", ru: "ru_RU", uk: "uk_UA",
  };

  return {
    title: {
      template: `%s | ${siteConfig.name}`,
      default: t("title"),
    },
    description: t("description"),
    keywords: t("keywords"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: `${siteConfig.url}/${locale}`,
      siteName: siteConfig.name,
      locale: OG_LOCALES[locale] ?? "pl_PL",
      type: "website",
    },
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}`])
      ),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as never)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  const t = await getTranslations({ locale, namespace: "faq" });

  // TODO: Dodac AggregateRating po integracji z Google Reviews
  const faqKeys = ["cost", "duration", "documents", "workWhileWaiting", "worldwide", "rejected"] as const;

  const jsonLdGraph = [
    {
      "@type": "LegalService",
      name: siteConfig.name,
      legalName: siteConfig.legalName,
      url: siteConfig.url,
      logo: `${siteConfig.url}/logo.jpg`,
      email: siteConfig.contact.email,
      address: {
        "@type": "PostalAddress",
        addressLocality: siteConfig.contact.address.city,
        addressCountry: "PL",
      },
      areaServed: "PL",
      description: siteConfig.description[locale as keyof typeof siteConfig.description],
      knowsLanguage: ["pl", "en", "ru", "uk"],
      serviceType: [
        "Karta pobytu", "Karta pobytu czasowego", "Karta stalego pobytu",
        "Zezwolenie na prace", "EU Blue Card", "Tlumaczenia przysiegle",
      ],
      priceRange: "$$",
    },
    {
      "@type": "WebSite",
      name: "getpermit.pl",
      url: siteConfig.url,
      inLanguage: ["pl", "en", "ru", "uk"],
      description: "Profesjonalna pomoc w legalizacji pobytu i pracy cudzoziemcow w Polsce",
    },
    {
      "@type": "FAQPage",
      mainEntity: faqKeys.map((key) => ({
        "@type": "Question",
        name: t(`items.${key}.q`),
        acceptedAnswer: {
          "@type": "Answer",
          text: t(`items.${key}.a`),
        },
      })),
    },
  ];
  const jsonLd = { "@context": "https://schema.org", "@graph": jsonLdGraph };

  return (
    <NextIntlClientProvider messages={messages}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
        >
          Przejdź do treści
        </a>
        <Header />
        <main id="main" className="flex-1">{children}</main>
        <Footer />
      </div>
      <CookieConsent />
    </NextIntlClientProvider>
  );
}
