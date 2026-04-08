import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { FileText } from "lucide-react";

export const metadata = {
  title: "Regulamin",
  robots: { index: true, follow: true },
};

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Container className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <FileText className="h-7 w-7" />
        </span>
        <h1 className="mt-6 font-display text-4xl font-extrabold text-primary md:text-5xl">
          Regulamin
        </h1>
        <p className="mt-5 text-lg text-ink/60">
          Dokument w opracowaniu. W sprawach pilnych skontaktuj się z nami:{" "}
          <a
            href="mailto:kontakt@getpermit.pl"
            className="text-accent hover:underline"
          >
            kontakt@getpermit.pl
          </a>
          .
        </p>
        <p className="mt-6 text-base text-ink/70">
          Usługodawca: <strong>UTM Group Grzegorz Stępień</strong>, NIP:
          9482342576.
        </p>
      </div>
    </Container>
  );
}
