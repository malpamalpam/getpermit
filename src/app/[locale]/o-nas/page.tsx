import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/config/site";
import { Shield, Users, Award, Heart } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return {
    title: t("about"),
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tNav = await getTranslations("nav");

  const values = [
    {
      icon: Shield,
      title: "Bezpieczeństwo",
      desc: "Pełna ochrona Twoich danych i interesów na każdym etapie procedury.",
    },
    {
      icon: Users,
      title: "Doświadczenie",
      desc: "Ponad 10 lat pracy z cudzoziemcami z całego świata.",
    },
    {
      icon: Award,
      title: "Skuteczność",
      desc: "98% naszych spraw kończy się pozytywną decyzją urzędu.",
    },
    {
      icon: Heart,
      title: "Misja",
      desc: "Działamy jako fundacja — pomagamy ludziom, nie tylko zarabiamy.",
    },
  ];

  return (
    <>
      <div className="bg-gradient-to-b from-surface to-white py-16 md:py-24">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-display text-4xl font-bold text-primary md:text-5xl">
              {tNav("about")}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-primary/70 md:text-xl">
              {siteConfig.legalName} to organizacja, która od ponad dekady pomaga
              cudzoziemcom legalnie żyć i pracować w Polsce. Łączymy doświadczenie
              prawników, ekspertów imigracyjnych i tłumaczy — wszystko po to, by
              proces legalizacji był dla Ciebie jasny, szybki i bezstresowy.
            </p>
          </div>
        </Container>
      </div>

      <Container className="py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => {
            const Icon = v.icon;
            return (
              <div
                key={i}
                className="rounded-xl border border-primary/10 bg-white p-6 shadow-card"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-primary">
                  {v.title}
                </h3>
                <p className="mt-2 text-sm text-primary/65">{v.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-16 max-w-3xl rounded-2xl border border-primary/10 bg-surface p-8 md:p-12">
          <h2 className="font-display text-2xl font-bold text-primary">
            Dane firmy
          </h2>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wider text-primary/50">
                Nazwa
              </dt>
              <dd className="mt-1 font-medium text-primary">
                {siteConfig.legalName}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-primary/50">
                NIP
              </dt>
              <dd className="mt-1 font-medium text-primary">
                {siteConfig.company.nip}
              </dd>
            </div>
          </dl>
        </div>
      </Container>
    </>
  );
}
