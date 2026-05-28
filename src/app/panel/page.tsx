import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { PanelHeader } from "@/components/panel/PanelHeader";
import { CaseCard } from "@/components/panel/CaseCard";
import { requireUser } from "@/lib/auth";
import { getPanelLocale } from "@/lib/panel-locale";
import { db } from "@/lib/db";
import { Inbox, Mail, AlertTriangle, CheckCircle2, FileText } from "lucide-react";

export const metadata = {
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ payment?: string }>;
}

export default async function PanelDashboardPage({ searchParams }: Props) {
  const locale = await getPanelLocale();
  const t = await getTranslations({ locale, namespace: "panel.dashboard" });
  const user = await requireUser();
  const { payment } = await searchParams;

  const [cases, agreement] = await Promise.all([
    db.case.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    }),
    db.userAgreement.findUnique({ where: { userId: user.id } }),
  ]);

  const docsAccepted =
    !!agreement?.termsAccepted &&
    !!agreement.privacyAccepted &&
    !!agreement.contractAccepted;
  const isPaid = agreement?.paymentStatus === "paid";
  const paymentSuccess = payment === "success";

  const greetingName = user.firstName ?? user.email.split("@")[0] ?? "";

  return (
    <>
      <PanelHeader user={user} active="dashboard" />
      <Container className="py-10 md:py-14">
        <div className="mb-10">
          <h1 className="font-display text-3xl font-extrabold text-primary md:text-4xl">
            {greetingName
              ? t("greeting", { name: greetingName })
              : t("greetingFallback")}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-ink/60">
            {t("subtitle")}
          </p>
        </div>

        {/* Status banery */}
        {paymentSuccess && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
            <span>
              <strong>Dziękujemy!</strong> Płatność została zrealizowana.
              Administrator wkrótce przystąpi do realizacji Twojej sprawy.
            </span>
          </div>
        )}

        {!docsAccepted && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
              <span>
                <strong>Wymagana akceptacja dokumentów.</strong>{" "}
                Przed przystąpieniem do realizacji sprawy należy zaakceptować regulamin, politykę prywatności i umowę, a następnie dokonać płatności.
              </span>
            </div>
            <Link
              href="/panel/dokumenty"
              className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
            >
              <FileText className="h-3.5 w-3.5" />
              Przejdź
            </Link>
          </div>
        )}

        {docsAccepted && !isPaid && !paymentSuccess && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
              <span>
                <strong>Oczekuje na płatność.</strong>{" "}
                Dokumenty zaakceptowane — dokończ płatność, aby uruchomić realizację sprawy.
              </span>
            </div>
            <Link
              href="/panel/dokumenty"
              className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-md bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600"
            >
              Zapłać
            </Link>
          </div>
        )}

        {cases.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-primary/20 bg-white p-10 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Inbox className="h-8 w-8" />
            </div>
            <h2 className="font-display text-xl font-bold text-primary">
              {t("noCases")}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-ink/60">
              {t("noCasesDescription")}
            </p>
            <div className="mt-6">
              <Link href={`/${locale}/kontakt`}>
                <Button variant="accent" size="md">
                  <Mail className="h-4 w-4" />
                  {t("contactButton")}
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {cases.map((c) => (
              <CaseCard key={c.id} case={c} />
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
