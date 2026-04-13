import { Container } from "@/components/ui/Container";
import { ArrowRight } from "lucide-react";

const STEPS = [
  {
    num: "1",
    title: "Bezpłatna konsultacja",
    desc: "Opowiedz o swojej sytuacji — nasi eksperci ocenią sprawę i zaproponują optymalną strategię.",
  },
  {
    num: "2",
    title: "Opracowanie dokumentacji",
    desc: "Podpisanie umowy, kompletowanie i przygotowanie wszystkich wymaganych dokumentów.",
  },
  {
    num: "3",
    title: "Pozytywna decyzja",
    desc: "Reprezentujemy Cię przed urzędem aż do otrzymania dokumentów potwierdzających Twój status.",
  },
];

export function ProcessSection() {
  return (
    <section className="bg-surface py-16 md:py-20">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-accent">
            <span className="inline-block h-0.5 w-6 bg-accent" />
            Jak działamy
          </span>
          <h2 className="mt-3 font-display text-3xl font-extrabold text-primary md:text-4xl">
            3 proste kroki
          </h2>
          <p className="mt-4 text-lg text-ink/60">
            Każdy przypadek traktujemy indywidualnie, oferując dopasowane rozwiązania.
          </p>
        </div>

        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.num} className="relative text-center">
              {/* Arrow connector (between steps, hidden on last + on small screens) */}
              {i < STEPS.length - 1 && (
                <ArrowRight
                  className="absolute -right-5 top-7 hidden h-6 w-6 text-primary/20 md:block"
                  aria-hidden="true"
                />
              )}
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary font-display text-xl font-extrabold text-white shadow-[0_8px_24px_rgba(15,27,51,0.25)]">
                {step.num}
              </div>
              <h3 className="font-display text-base font-bold text-primary">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/55">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
