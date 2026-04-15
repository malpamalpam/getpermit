import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { ArrowRight } from "lucide-react";

const STEP_KEYS = ["step1", "step2", "step3"] as const;

export function ProcessSection() {
  const t = useTranslations("process");

  return (
    <section className="bg-surface py-16 md:py-20">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-accent">
            <span className="inline-block h-0.5 w-6 bg-accent" />
            {t("label")}
          </span>
          <h2 className="mt-3 font-display text-3xl font-extrabold text-primary md:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg text-ink/60">
            {t("subtitle")}
          </p>
        </div>

        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {STEP_KEYS.map((key, i) => (
            <div key={key} className="relative text-center">
              {i < STEP_KEYS.length - 1 && (
                <ArrowRight
                  className="absolute -right-5 top-7 hidden h-6 w-6 text-primary/20 md:block"
                  aria-hidden="true"
                />
              )}
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary font-display text-xl font-extrabold text-white shadow-[0_8px_24px_rgba(15,27,51,0.25)]">
                {i + 1}
              </div>
              <h3 className="font-display text-base font-bold text-primary">
                {t(`${key}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/55">
                {t(`${key}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
