import { useTranslations, useLocale } from "next-intl";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

export function CtaBanner() {
  const t = useTranslations("ctaBanner");
  const locale = useLocale();

  return (
    <section className="py-16 md:py-20">
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
              <a href={`/${locale}/kontakt`}>
                <Button variant="accent" size="lg">
                  {t("button")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
