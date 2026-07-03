import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { getPanelLocale } from "@/lib/panel-locale";
import { db } from "@/lib/db";
import { ArrowLeft, User as UserIcon, Mail, Phone, CheckCircle2, XCircle, CreditCard } from "lucide-react";

async function setClientAmountAction(fd: FormData) {
  "use server";
  await requireAdmin();
  const userId = fd.get("userId") as string;
  const amountPln = parseFloat(fd.get("amountPln") as string);
  if (!userId || isNaN(amountPln) || amountPln < 0) return;
  await db.userAgreement.upsert({
    where: { userId },
    create: { userId, amount: Math.round(amountPln * 100) },
    update: { amount: Math.round(amountPln * 100) },
  });
  revalidatePath(`/admin/klienci/${userId}`);
}

export const metadata = {
  robots: { index: false, follow: false },
};

function formatDate(date: Date | null | undefined): string {
  if (!date) return "\u2014";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function boolLabel(val: boolean | null | undefined, t: (k: string) => string): string {
  if (val === true) return t("yes");
  if (val === false) return t("no");
  return "\u2014";
}

/** Safe translation: returns the raw value if key doesn't resolve to a known translation. */
function safeT(t: (k: string) => string, key: string, raw: string): string {
  try {
    const result = t(key);
    if (typeof result !== "string") return raw;
    return result === key ? raw : result;
  } catch {
    return raw;
  }
}

function StatusBadge({ label, ok, icon }: { label: string; ok: boolean; icon: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        ok
          ? "border border-green-200 bg-green-50 text-green-700"
          : "border border-red-200 bg-red-50 text-red-600"
      }`}
    >
      {ok ? icon : <XCircle className="h-4 w-4" />}
      {label}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-primary/50">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-primary">
        {value || "\u2014"}
      </dd>
    </div>
  );
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getPanelLocale();
  const t = await getTranslations({ locale, namespace: "panel.questionnaire" });
  const user = await requireStaff();

  const client = await db.user.findUnique({
    where: { id },
    include: {
      personalData: true,
      agreement: true,
      _count: { select: { cases: true } },
    },
  });

  if (!client) notFound();

  const pd = client.personalData;
  const ag = client.agreement;

  return (
    <>
      <AdminHeader user={user} active="clients" />
      <Container className="py-10 md:py-14">
        <Link
          href="/admin/klienci"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary/60 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Klienci
        </Link>

        {/* Client header */}
        <div className="mt-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
            <UserIcon className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-primary">
              {client.firstName || pd?.firstNameLatin || ""} {client.lastName || pd?.lastNameLatin || ""}
            </h1>
            <div className="flex items-center gap-4 text-sm text-ink/60">
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {client.email}
              </span>
              {client.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {client.phone}
                </span>
              )}
              <span>Sprawy: {client._count.cases}</span>
            </div>
          </div>
        </div>

        {/* Agreement & payment status */}
        <div className="mt-6 flex flex-wrap gap-3">
          <StatusBadge
            label="Dokumenty zaakceptowane"
            ok={!!ag?.termsAccepted && !!ag.privacyAccepted && !!ag.contractAccepted}
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <StatusBadge
            label={`Płatność: ${ag?.paymentStatus ?? "brak"}`}
            ok={ag?.paymentStatus === "paid"}
            icon={<CreditCard className="h-4 w-4" />}
          />
          {ag?.amount && ag.amount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-white px-3 py-1 text-xs font-medium text-primary">
              Kwota: {(ag.amount / 100).toLocaleString("pl-PL")} zł
            </span>
          ) : null}
        </div>

        {/* Admin: ustaw kwotę */}
        <form action={setClientAmountAction} className="mt-4 flex items-center gap-2">
          <input type="hidden" name="userId" value={id} />
          <label className="text-xs font-medium text-primary/60">Ustaw kwotę (PLN):</label>
          <input
            name="amountPln"
            type="number"
            min="0"
            step="0.01"
            defaultValue={ag?.amount ? ag.amount / 100 : ""}
            placeholder="np. 500"
            className="w-28 rounded-md border border-primary/15 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary/90"
          >
            Zapisz
          </button>
        </form>

        {!pd ? (
          <div className="mt-8 rounded-2xl border border-dashed border-primary/15 p-10 text-center text-sm text-ink/50">
            Klient nie wypełnił jeszcze ankiety danych osobowych.
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {/* Section A */}
            <section className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-display text-lg font-bold text-primary">
                {t("sectionA.title")}
              </h2>
              <dl className="grid gap-4 md:grid-cols-3">
                <Field label={t("sectionA.firstNameLatin")} value={pd.firstNameLatin} />
                <Field label={t("sectionA.lastNameLatin")} value={pd.lastNameLatin} />
                <Field label={t("sectionA.nativeFullName")} value={pd.nativeFullName} />
                <Field label={t("sectionA.gender")} value={pd.gender ? safeT(t, `sectionA.options.gender.${pd.gender}`, pd.gender) : null} />
                <Field label={t("sectionA.dateOfBirth")} value={formatDate(pd.dateOfBirth)} />
                <Field label={t("sectionA.placeOfBirth")} value={pd.placeOfBirth} />
                <Field label={t("sectionA.countryOfBirth")} value={pd.countryOfBirth} />
                <Field label={t("sectionA.citizenship")} value={pd.citizenship} />
                <Field label={t("sectionA.secondCitizenship")} value={pd.secondCitizenship} />
                <Field label={t("sectionA.nationality")} value={pd.nationality} />
                <Field label={t("sectionA.maritalStatus")} value={pd.maritalStatus ? safeT(t, `sectionA.options.maritalStatus.${pd.maritalStatus}`, pd.maritalStatus) : null} />
                <Field label={t("sectionA.fatherName")} value={pd.fatherName} />
                <Field label={t("sectionA.motherName")} value={pd.motherName} />
                <Field label={t("sectionA.motherMaidenName")} value={pd.motherMaidenName} />
              </dl>
            </section>

            {/* Section B */}
            <section className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-display text-lg font-bold text-primary">
                {t("sectionB.title")}
              </h2>
              <dl className="grid gap-4 md:grid-cols-3">
                <Field label={t("sectionB.passportNumber")} value={pd.passportNumber} />
                <Field label={t("sectionB.passportSeries")} value={pd.passportSeries} />
                <Field label={t("sectionB.passportIssueDate")} value={formatDate(pd.passportIssueDate)} />
                <Field label={t("sectionB.passportExpiryDate")} value={formatDate(pd.passportExpiryDate)} />
                <Field label={t("sectionB.passportIssuingAuthority")} value={pd.passportIssuingAuthority} />
                <Field label={t("sectionB.pesel")} value={pd.pesel} />
                <Field label={t("sectionB.residenceCardNumber")} value={pd.residenceCardNumber} />
                <Field label={t("sectionB.residenceCardExpiry")} value={formatDate(pd.residenceCardExpiry)} />
                <Field label={t("sectionB.visaNumber")} value={pd.visaNumber} />
                <Field label={t("sectionB.visaType")} value={pd.visaType ? safeT(t, `sectionB.options.visaType.${pd.visaType}`, pd.visaType) : null} />
                <Field label={t("sectionB.visaExpiry")} value={formatDate(pd.visaExpiry)} />
              </dl>
            </section>

            {/* Section C */}
            <section className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-display text-lg font-bold text-primary">
                {t("sectionC.title")}
              </h2>
              <dl className="grid gap-4 md:grid-cols-3">
                <Field label={t("sectionC.street")} value={pd.street} />
                <Field label={t("sectionC.houseNumber")} value={pd.houseNumber} />
                <Field label={t("sectionC.apartmentNumber")} value={pd.apartmentNumber} />
                <Field label={t("sectionC.postalCode")} value={pd.postalCode} />
                <Field label={t("sectionC.city")} value={pd.city} />
                <Field label={t("sectionC.voivodeship")} value={pd.voivodeship ? safeT(t, `sectionC.options.voivodeship.${pd.voivodeship}`, pd.voivodeship) : null} />
                <Field label={t("sectionC.registrationAddress")} value={pd.registrationAddress} />
                <Field label={t("sectionC.correspondenceAddress")} value={pd.correspondenceAddress} />
              </dl>
            </section>

            {/* Section D */}
            <section className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-display text-lg font-bold text-primary">
                {t("sectionD.title")}
              </h2>
              <dl className="grid gap-4 md:grid-cols-3">
                <Field label={t("sectionD.phoneNumber")} value={pd.phoneNumber} />
                <Field label={t("sectionD.contactEmail")} value={pd.contactEmail} />
                <Field label={t("sectionD.additionalPhone")} value={pd.additionalPhone} />
                <Field label={t("sectionD.preferredLanguage")} value={pd.preferredLanguage ? safeT(t, `sectionD.options.preferredLanguage.${pd.preferredLanguage}`, pd.preferredLanguage) : null} />
              </dl>
            </section>

            {/* Section E */}
            <section className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-display text-lg font-bold text-primary">
                {t("sectionE.title")}
              </h2>
              <dl className="grid gap-4 md:grid-cols-3">
                <Field label={t("sectionE.firstEntryDate")} value={formatDate(pd.firstEntryDate)} />
                <Field label={t("sectionE.lastEntryDate")} value={formatDate(pd.lastEntryDate)} />
                <Field label={t("sectionE.purposeOfStay")} value={pd.purposeOfStay ? safeT(t, `sectionE.options.purposeOfStay.${pd.purposeOfStay}`, pd.purposeOfStay) : null} />
                <Field label={t("sectionE.currentResidenceTitle")} value={pd.currentResidenceTitle ? safeT(t, `sectionE.options.residenceTitle.${pd.currentResidenceTitle}`, pd.currentResidenceTitle) : null} />
                <Field label={t("sectionE.pendingProceedings")} value={boolLabel(pd.pendingProceedings, t)} />
                <Field label={t("sectionE.caseNumberAtOffice")} value={pd.caseNumberAtOffice} />
                <Field label={t("sectionE.handlingOffice")} value={pd.handlingOffice ? safeT(t, `sectionE.options.handlingOffice.${pd.handlingOffice}`, pd.handlingOffice) : null} />
                <Field label={t("sectionE.criminalRecord")} value={boolLabel(pd.criminalRecord, t)} />
                <Field label={t("sectionE.deportationProceedings")} value={boolLabel(pd.deportationProceedings, t)} />
                <Field label={t("sectionE.plannedStayDuration")} value={pd.plannedStayDuration} />
                <Field label={t("sectionE.occupation")} value={pd.occupation} />
              </dl>
            </section>

            {/* Section F */}
            <section className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-display text-lg font-bold text-primary">
                {t("sectionF.title")}
              </h2>
              <dl className="grid gap-4 md:grid-cols-3">
                <Field label={t("sectionF.employerName")} value={pd.employerName} />
                <Field label={t("sectionF.employerStreet")} value={pd.employerStreet} />
                <Field label={t("sectionF.employerHouseNumber")} value={pd.employerHouseNumber} />
                <Field label={t("sectionF.employerApartmentNumber")} value={pd.employerApartmentNumber} />
                <Field label={t("sectionF.employerPostalCode")} value={pd.employerPostalCode} />
                <Field label={t("sectionF.employerCity")} value={pd.employerCity} />
                <Field label={t("sectionF.employerPhone")} value={pd.employerPhone} />
                <Field label={t("sectionF.employerEmail")} value={pd.employerEmail} />
                <Field label={t("sectionF.contractType")} value={pd.contractType ? safeT(t, `sectionF.options.contractType.${pd.contractType}`, pd.contractType) : null} />
                <Field label={t("sectionF.contractFrom")} value={formatDate(pd.contractFrom)} />
                <Field label={t("sectionF.contractTo")} value={pd.contractIndefinite ? t("sectionF.contractIndefinite") : formatDate(pd.contractTo)} />
                <Field label={t("sectionF.salary")} value={pd.salary} />
              </dl>
            </section>
          </div>
        )}
      </Container>
    </>
  );
}
