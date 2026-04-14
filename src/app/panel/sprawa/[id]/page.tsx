import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { PanelHeader } from "@/components/panel/PanelHeader";
import { StatusBadge } from "@/components/panel/StatusBadge";
import { CaseTimeline } from "@/components/panel/CaseTimeline";
import { ClientDocumentList } from "@/components/panel/ClientDocumentList";
import { ClientDocumentUpload } from "@/components/panel/ClientDocumentUpload";
import { CaseMessages } from "@/components/panel/CaseMessages";
import { requireUser } from "@/lib/auth";
import { getPanelLocale } from "@/lib/panel-locale";
import { db } from "@/lib/db";
import { logAccess } from "@/lib/access-log";
import { ArrowLeft, Calendar, User as UserIcon, Mail, Phone, MessageSquare } from "lucide-react";

export const metadata = {
  robots: { index: false, follow: false },
};

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getPanelLocale();
  const t = await getTranslations({ locale, namespace: "panel.case" });
  const tType = await getTranslations({ locale, namespace: "caseType" });

  const user = await requireUser();

  // Pobierz sprawę z weryfikacją własności (klient widzi tylko swoje, staff/admin wszystkie)
  const caseRecord = await db.case.findUnique({
    where: { id },
    include: {
      events: { orderBy: { eventDate: "desc" } },
      documents: { orderBy: { uploadedAt: "desc" } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
      },
      assignedStaff: true,
    },
  });

  if (!caseRecord) notFound();

  // Authorization: klient może oglądać tylko swoją sprawę
  const isOwner = caseRecord.userId === user.id;
  const isStaff = user.role === "STAFF" || user.role === "ADMIN";
  if (!isOwner && !isStaff) notFound();

  // Log dostępu (fire-and-forget)
  void logAccess({
    userId: user.id,
    caseId: caseRecord.id,
    action: "VIEW_CASE",
  });

  return (
    <>
      <PanelHeader user={user} active="dashboard" />
      <Container className="py-10 md:py-14">
        <Link
          href="/panel"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary/60 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToList")}
        </Link>

        {/* Header */}
        <div className="mt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-accent">
                {tType(caseRecord.type)}
              </div>
              <h1 className="mt-2 font-display text-3xl font-extrabold text-primary md:text-4xl">
                {caseRecord.title}
              </h1>
            </div>
          </div>

          {caseRecord.description && (
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink/70">
              {caseRecord.description}
            </p>
          )}

          {/* Prominent case status */}
          <div className="mt-6 rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary/60">
              {t("currentStatus")}
            </h2>
            <div className="mt-2">
              <StatusBadge status={caseRecord.status} size="lg" />
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[2fr_1fr]">
          {/* Left: timeline + documents + messages */}
          <div className="space-y-10">
            <section>
              <h2 className="mb-5 font-display text-xl font-bold text-primary">
                {t("timeline")}
              </h2>
              <CaseTimeline events={caseRecord.events} />
            </section>

            <section>
              <h2 className="mb-5 font-display text-xl font-bold text-primary">
                {t("documents")}
              </h2>
              <div className="space-y-6">
                <ClientDocumentUpload caseId={caseRecord.id} />
                <ClientDocumentList
                  documents={caseRecord.documents}
                  currentUserId={user.id}
                  caseId={caseRecord.id}
                />
              </div>
            </section>

            <section>
              <h2 className="mb-5 flex items-center gap-2 font-display text-xl font-bold text-primary">
                <MessageSquare className="h-5 w-5 text-accent" />
                {t("messages")}
              </h2>
              <CaseMessages
                caseId={caseRecord.id}
                messages={caseRecord.messages}
                currentUserId={user.id}
              />
            </section>
          </div>

          {/* Right: meta info */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
              <h3 className="font-display text-base font-bold text-primary">
                {t("details")}
              </h3>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-primary/50">
                    <Calendar className="h-3 w-3" />
                    {t("submittedAt")}
                  </dt>
                  <dd className="mt-1 font-medium text-primary">
                    {formatDate(caseRecord.submittedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-primary/50">
                    <Calendar className="h-3 w-3" />
                    {t("expectedDecision")}
                  </dt>
                  <dd className="mt-1 font-medium text-primary">
                    {formatDate(caseRecord.expectedDecisionAt)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 font-display text-base font-bold text-primary">
                <UserIcon className="h-4 w-4 text-accent" />
                {t("assignedStaff")}
              </h3>
              {caseRecord.assignedStaff ? (
                <div className="mt-4 space-y-2 text-sm">
                  <div className="font-medium text-primary">
                    {caseRecord.assignedStaff.firstName}{" "}
                    {caseRecord.assignedStaff.lastName}
                  </div>
                  <a
                    href={`mailto:${caseRecord.assignedStaff.email}`}
                    className="flex items-center gap-1.5 text-xs text-primary/70 hover:text-accent"
                  >
                    <Mail className="h-3 w-3" />
                    {caseRecord.assignedStaff.email}
                  </a>
                  {caseRecord.assignedStaff.phone && (
                    <a
                      href={`tel:${caseRecord.assignedStaff.phone}`}
                      className="flex items-center gap-1.5 text-xs text-primary/70 hover:text-accent"
                    >
                      <Phone className="h-3 w-3" />
                      {caseRecord.assignedStaff.phone}
                    </a>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink/50">{t("noStaff")}</p>
              )}
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}
