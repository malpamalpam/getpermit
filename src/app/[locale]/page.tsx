import { setRequestLocale, getTranslations } from "next-intl/server";
import { HeroSection } from "@/components/home/HeroSection";
import { ServicesGrid } from "@/components/home/ServicesGrid";
import { ProcessSection } from "@/components/home/ProcessSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { FaqSection } from "@/components/home/FaqSection";
import { CtaBanner } from "@/components/home/CtaBanner";

const SECTION_IDS: Record<string, Record<string, string>> = {
  uslugi: { pl: "uslugi", en: "services", ru: "uslugi", uk: "poslugy" },
  proces: { pl: "proces", en: "process", ru: "process", uk: "process" },
  opinie: { pl: "opinie", en: "testimonials", ru: "otzyvy", uk: "vidguky" },
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sid = (key: string) => SECTION_IDS[key]?.[locale] ?? key;

  // FAQ JSON-LD — only on the homepage (not in layout to avoid duplication)
  const t = await getTranslations({ locale, namespace: "faq" });
  const faqKeys = ["cost", "duration", "documents", "workWhileWaiting", "worldwide", "rejected"] as const;
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqKeys.map((key) => ({
      "@type": "Question",
      name: t(`items.${key}.q`),
      acceptedAnswer: {
        "@type": "Answer",
        text: t(`items.${key}.a`),
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <HeroSection />
      <ServicesGrid />
      <div id={sid("proces")} className="scroll-mt-24">
        <ProcessSection />
      </div>
      <div id={sid("opinie")} className="scroll-mt-24">
        <TestimonialsSection />
      </div>
      <FaqSection />
      <CtaBanner />
    </>
  );
}
