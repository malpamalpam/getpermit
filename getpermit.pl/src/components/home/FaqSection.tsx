import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { HelpCircle, ChevronRight } from "lucide-react";

const FAQ_KEYS = ["cost", "duration", "documents", "workWhileWaiting", "worldwide", "rejected"] as const;

export function FaqSection() {
  const t = useTranslations("faq");

  return (
    <section className="bg-surface py-16 md:py-20">
      <Container>
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-extrabold text-primary md:text-4xl">
              {t("title")}
            </h2>
            <p className="mt-3 text-lg text-ink/60">{t("subtitle")}</p>
          </div>

          <div className="space-y-3">
            {FAQ_KEYS.map((key) => (
              <details
                key={key}
                className="group rounded-xl border border-primary/10 bg-white shadow-sm"
              >
                <summary className="flex cursor-pointer items-start justify-between gap-4 px-6 py-5 font-medium text-primary">
                  <span className="flex items-start gap-3">
                    <HelpCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent" />
                    {t(`items.${key}.q`)}
                  </span>
                  <ChevronRight className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary/40 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-6 pb-5 pl-14 text-sm leading-relaxed text-ink/70">
                  {t(`items.${key}.a`)}
                </div>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
