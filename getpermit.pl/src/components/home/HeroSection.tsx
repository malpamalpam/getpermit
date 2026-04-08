import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { BookingButton } from "@/components/booking/BookingButton";
import { ArrowRight, BookOpen } from "lucide-react";

const HERO_VIDEO_SRC =
  "/VIDEOS/hf_20260408_185746_f4ac7978-97b7-4ac9-ab4c-7b87612cea22.mp4";

export function HeroSection() {
  const t = useTranslations("hero");

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-[#1a2f5a]">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -right-40 -top-40 h-[800px] w-[800px] rounded-full bg-accent/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />

      <Container className="relative">
        <div className="grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-brand-light backdrop-blur">
              ✦ {t("badge")}
            </span>

            <h1 className="mt-5 font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-4xl md:text-5xl">
              {t("title")}
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
              {t("subtitle")}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <BookingButton variant="accent" size="xl" className="w-full sm:w-auto">
                {t("ctaPrimary")}
                <ArrowRight className="h-5 w-5" />
              </BookingButton>
              <Link href="/blog" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full border-white/25 bg-transparent text-white hover:bg-white/5 sm:w-auto"
                >
                  <BookOpen className="h-4 w-4" />
                  {t("blogCta")}
                </Button>
              </Link>
            </div>
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
              {/* Subtle navy gradient overlay for cohesion */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-primary-800/40 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
