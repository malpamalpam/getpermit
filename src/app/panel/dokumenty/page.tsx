import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/Container";
import { PanelHeader } from "@/components/panel/PanelHeader";
import { AcceptanceForm } from "./AcceptanceForm";
import { generateContractHtml } from "@/lib/legal/contract";
import { getTermsHtml } from "@/lib/legal/terms";
import { getPrivacyHtml } from "@/lib/legal/privacy";

export const metadata = {
  title: "Dokumenty i płatność — Panel Klienta",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ payment?: string }>;
}

export default async function DokumentyPage({ searchParams }: Props) {
  const user = await requireUser();
  const { payment } = await searchParams;

  const [agreement, personalData] = await Promise.all([
    db.userAgreement.findUnique({ where: { userId: user.id } }),
    db.personalData.findUnique({ where: { userId: user.id } }),
  ]);

  const address = personalData
    ? [personalData.street, personalData.houseNumber, personalData.postalCode, personalData.city]
        .filter(Boolean)
        .join(", ")
    : undefined;

  const alreadyAccepted =
    !!agreement?.termsAccepted &&
    !!agreement.privacyAccepted &&
    !!agreement.contractAccepted;

  const alreadyPaid = agreement?.paymentStatus === "paid";
  const paymentCancelled = payment === "cancelled";
  const amountPln = agreement && agreement.amount > 0 ? agreement.amount / 100 : null;

  const contractHtml = generateContractHtml({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    address,
    amountPln: amountPln ?? undefined,
  });

  const termsHtml = getTermsHtml();
  const privacyHtml = getPrivacyHtml();

  return (
    <>
      <PanelHeader user={user} active="dokumenty" />
      <Container className="py-10 md:py-14">
        <h1 className="font-display text-3xl font-extrabold text-primary">
          Dokumenty i płatność
        </h1>
        <p className="mt-3 max-w-2xl text-base text-ink/60">
          Zapoznaj się z poniższymi dokumentami, zaakceptuj je, a następnie dokonaj płatności,
          aby administrator mógł przystąpić do realizacji Twojej sprawy.
        </p>

        <div className="mt-10 space-y-8 lg:grid lg:grid-cols-3 lg:gap-10 lg:space-y-0">
          {/* Dokumenty */}
          <div className="space-y-6 lg:col-span-2">
            <DocSection title="1. Regulamin świadczenia usług" htmlContent={termsHtml} />
            <DocSection title="2. Polityka prywatności i RODO" htmlContent={privacyHtml} />
            <DocSection
              title="3. Umowa o świadczenie usług legalizacyjnych"
              htmlContent={contractHtml}
            />
          </div>

          {/* Akceptacja i płatność */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-primary/10 bg-white p-6 shadow-card">
              <h2 className="mb-6 font-display text-lg font-bold text-primary">
                Akceptacja i płatność
              </h2>
              <AcceptanceForm
                alreadyAccepted={alreadyAccepted}
                alreadyPaid={alreadyPaid}
                paymentCancelled={paymentCancelled}
                amountPln={amountPln}
              />
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}

function DocSection({
  title,
  htmlContent,
}: {
  title: string;
  htmlContent: string;
}) {
  return (
    <details className="rounded-2xl border border-primary/10 bg-white shadow-card">
      <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-display text-base font-bold text-primary hover:bg-primary/5">
        {title}
        <span className="ml-4 text-xs font-normal text-primary/40">Kliknij, aby rozwinąć</span>
      </summary>
      <div
        className="border-t border-primary/10 px-6 py-6 text-sm leading-relaxed text-primary/80 overflow-auto max-h-[500px]"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </details>
  );
}
