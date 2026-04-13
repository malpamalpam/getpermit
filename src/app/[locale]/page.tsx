import { setRequestLocale } from "next-intl/server";
import { HeroSection } from "@/components/home/HeroSection";
import { ServicesGrid } from "@/components/home/ServicesGrid";
import { ProcessSection } from "@/components/home/ProcessSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { FaqSection } from "@/components/home/FaqSection";
import { CtaBanner } from "@/components/home/CtaBanner";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <HeroSection />
      <div id="uslugi" className="scroll-mt-24">
        <ServicesGrid />
      </div>
      <div id="proces" className="scroll-mt-24">
        <ProcessSection />
      </div>
      <div id="opinie" className="scroll-mt-24">
        <TestimonialsSection />
      </div>
      <FaqSection />
      <CtaBanner />
    </>
  );
}
