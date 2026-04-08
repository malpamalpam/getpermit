import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Shield } from "lucide-react";

export const metadata = {
  title: "Polityka prywatności",
  robots: { index: true, follow: true },
};

export default async function PrivacyPolicyPage({
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
          <Shield className="h-7 w-7" />
        </span>
        <h1 className="mt-6 font-display text-4xl font-extrabold text-primary md:text-5xl">
          Polityka prywatności
        </h1>
        <p className="mt-5 text-lg text-ink/60">
          Dokument w opracowaniu — ostateczna treść zostanie opublikowana
          wkrótce. W razie pytań dotyczących przetwarzania Twoich danych
          osobowych skontaktuj się z nami:{" "}
          <a
            href="mailto:kontakt@getpermit.pl"
            className="text-accent hover:underline"
          >
            kontakt@getpermit.pl
          </a>
          .
        </p>

        <div className="mt-10 space-y-6 text-base leading-relaxed text-ink/80">
          <p>
            <strong>Administrator danych:</strong> UTM Group Grzegorz Stępień,
            NIP: 9482342576.
          </p>
          <p>
            <strong>Przetwarzane dane:</strong> imię, nazwisko, adres email,
            telefon, dane sprawy legalizacyjnej (typ, status, dokumenty),
            adres IP i logi dostępu — wyłącznie w celu realizacji usługi.
          </p>
          <p>
            <strong>Podstawa prawna:</strong> RODO art. 6 ust. 1 lit. b
            (wykonanie umowy) oraz lit. c (obowiązki prawne).
          </p>
          <p>
            <strong>Okres retencji:</strong> dane spraw zamkniętych są
            automatycznie anonimizowane po 5 latach od ostatniej aktualizacji.
          </p>
          <p>
            <strong>Prawa:</strong> dostępu, sprostowania, usunięcia,
            ograniczenia przetwarzania, przenoszenia danych, sprzeciwu, skargi
            do Prezesa UODO.
          </p>
        </div>
      </div>
    </Container>
  );
}
