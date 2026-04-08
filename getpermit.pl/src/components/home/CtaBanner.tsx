import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { BookingButton } from "@/components/booking/BookingButton";
import { ArrowRight } from "lucide-react";

export function CtaBanner() {
  const t = useTranslations("ctaBanner");

  return (
    <section className="py-20">
      <Container>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-700 to-primary-800 px-8 py-14 text-center md:px-16 md:py-20">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-bold text-white md:text-4xl">
              {t("title")}
            </h2>
            <p className="mt-4 text-lg text-white/80">{t("subtitle")}</p>
            <div className="mt-8">
              <BookingButton variant="accent" size="lg">
                {t("button")}
                <ArrowRight className="h-4 w-4" />
              </BookingButton>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
