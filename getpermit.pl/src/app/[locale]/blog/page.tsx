import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { BookOpen } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("blog");

  return (
    <section className="bg-surface py-20 md:py-28">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <BookOpen className="h-8 w-8" />
          </span>
          <h1 className="mt-6 font-display text-4xl font-extrabold text-primary md:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-5 text-lg text-ink/60">{t("subtitle")}</p>

          <div className="mt-12 rounded-2xl border border-primary/10 bg-white p-10 shadow-sm">
            <p className="font-display text-2xl font-bold text-primary">
              {t("comingSoonTitle")}
            </p>
            <p className="mt-3 text-base text-ink/60">
              {t("comingSoonBody")}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
