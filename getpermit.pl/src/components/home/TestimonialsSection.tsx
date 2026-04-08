import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { Quote, Star } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Olena K.",
    role: "Ukraine → Warsaw",
    rating: 5,
    quote:
      "Otrzymałam kartę pobytu w 4 miesiące. Cały proces był jasny, dokumenty przygotowane bezbłędnie. Polecam każdemu cudzoziemcowi.",
  },
  {
    name: "Aleksey V.",
    role: "Belarus → Kraków",
    rating: 5,
    quote:
      "Pomogli mi załatwić zezwolenie na pracę typu A i kartę pobytu czasowego. Profesjonalnie i szybko, mimo skomplikowanej sytuacji.",
  },
  {
    name: "Rajesh P.",
    role: "India → Wrocław",
    rating: 5,
    quote:
      "Thanks to the team I got my permanent residence card. They explained every step in English and handled all the bureaucracy.",
  },
];

export function TestimonialsSection() {
  const t = useTranslations("testimonials");

  return (
    <section className="bg-white py-20 md:py-28">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-accent">
            <span className="inline-block h-0.5 w-6 bg-accent" />
            Opinie
          </span>
          <h2 className="mt-3 font-display text-3xl font-extrabold text-primary md:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg text-ink/60">{t("subtitle")}</p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((testimonial, i) => (
            <figure
              key={i}
              className="relative flex flex-col rounded-2xl border border-primary/10 bg-surface p-8 transition-all hover:border-accent hover:shadow-[0_8px_30px_rgba(37,99,235,0.08)]"
            >
              <Quote
                className="absolute right-6 top-6 h-8 w-8 text-accent/20"
                aria-hidden="true"
              />
              <div className="mb-4 flex gap-0.5">
                {Array.from({ length: testimonial.rating }).map((_, j) => (
                  <Star
                    key={j}
                    className="h-4 w-4 fill-accent text-accent"
                  />
                ))}
              </div>
              <blockquote className="flex-1 text-sm italic leading-relaxed text-ink/70">
                „{testimonial.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-primary/10 pt-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {testimonial.name.split(" ").map((p) => p[0]).join("")}
                </div>
                <div>
                  <div className="text-sm font-semibold text-primary">
                    {testimonial.name}
                  </div>
                  <div className="text-xs text-ink/45">{testimonial.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}
