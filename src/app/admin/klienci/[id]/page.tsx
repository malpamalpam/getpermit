import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { requireStaff } from "@/lib/auth";
import { getPanelLocale } from "@/lib/panel-locale";
import { db } from "@/lib/db";
import { ArrowLeft, User as UserIcon, Mail, Phone } from "lucide-react";

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
      _count: { select: { cases: true } },
    },
  });

  if (!client) notFound();

  const pd = client.personalData;

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
                <Field label={t("sectionA.gender")} value={pd.gender ? t(`sectionA.options.gender.${pd.gender}`) : null} />
                <Field label={t("sectionA.dateOfBirth")} value={formatDate(pd.dateOfBirth)} />
                <Field label={t("sectionA.placeOfBirth")} value={pd.placeOfBirth} />
                <Field label={t("sectionA.countryOfBirth")} value={pd.countryOfBirth} />
                <Field label={t("sectionA.citizenship")} value={pd.citizenship} />
                <Field label={t("sectionA.secondCitizenship")} value={pd.secondCitizenship} />
                <Field label={t("sectionA.nationality")} value={pd.nationality} />
                <Field label={t("sectionA.maritalStatus")} value={pd.maritalStatus ? t(`sectionA.options.maritalStatus.${pd.maritalStatus}`) : null} />
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
                <Field label={t("sectionB.visaType")} value={pd.visaType ? t(`sectionB.options.visaType.${pd.visaType}`) : null} />
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
                <Field label={t("sectionC.voivodeship")} value={pd.voivodeship ? t(`sectionC.options.voivodeship.${pd.voivodeship}`) : null} />
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
                <Field label={t("sectionD.preferredLanguage")} value={pd.preferredLanguage ? t(`sectionD.options.preferredLanguage.${pd.preferredLanguage}`) : null} />
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
                <Field label={t("sectionE.purposeOfStay")} value={pd.purposeOfStay ? t(`sectionE.options.purposeOfStay.${pd.purposeOfStay}`) : null} />
                <Field label={t("sectionE.currentResidenceTitle")} value={pd.currentResidenceTitle ? t(`sectionE.options.residenceTitle.${pd.currentResidenceTitle}`) : null} />
                <Field label={t("sectionE.pendingProceedings")} value={boolLabel(pd.pendingProceedings, t)} />
                <Field label={t("sectionE.caseNumberAtOffice")} value={pd.caseNumberAtOffice} />
                <Field label={t("sectionE.handlingOffice")} value={pd.handlingOffice ? t(`sectionE.options.handlingOffice.${pd.handlingOffice}`) : null} />
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
                <Field label={t("sectionF.contractType")} value={pd.contractType ? t(`sectionF.options.contractType.${pd.contractType}`) : null} />
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
