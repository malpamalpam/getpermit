import { useTranslations, useLocale } from "next-intl";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { HeroStats } from "./HeroStats";
import { siteConfig } from "@/config/site";
import { ArrowRight } from "lucide-react";

const HERO_VIDEO_SRC =
  "/VIDEOS/hf_20260408_185746_f4ac7978-97b7-4ac9-ab4c-7b87612cea22.mp4";

export function HeroSection() {
  const t = useTranslations("hero");
  const tStats = useTranslations("stats");
  const locale = useLocale();

  const stats = [
    { target: siteConfig.stats.yearsOfExperience, suffix: "+", label: tStats("years") },
    { target: siteConfig.stats.clientsServed, suffix: "+", label: tStats("clients") },
    { target: siteConfig.stats.successRate, suffix: "%", label: tStats("success") },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-[#1a2f5a]">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -right-40 -top-40 h-[800px] w-[800px] rounded-full bg-accent/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />

      <Container className="relative">
        <div className="grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:py-20">
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-4xl md:text-5xl">
              {t("title")}
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
              {t("subtitle")}
            </p>

            <div className="mt-7">
              <a href={`/${locale}/kontakt`}>
                <Button variant="accent" size="xl" className="w-full sm:w-auto">
                  {t("ctaPrimary")}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </a>
            </div>

            {/* Stats inline */}
            <HeroStats stats={stats} />
          </div>

          {/* Video */}
          <div className="relative hidden lg:block">
            <div className="relative aspect-[5/4] w-full max-h-[460px] overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
              <video
                src={HERO_VIDEO_SRC}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-primary-800/40 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
