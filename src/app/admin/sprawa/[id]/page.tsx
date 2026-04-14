import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CaseForm } from "@/components/admin/CaseForm";
import { EventsManager } from "@/components/admin/EventsManager";
import { DocumentsManager } from "@/components/admin/DocumentsManager";
import { AdminCaseMessages } from "@/components/admin/AdminCaseMessages";
import { requireStaff } from "@/lib/auth";
import { getPanelLocale } from "@/lib/panel-locale";
import { db } from "@/lib/db";
import { logAccess } from "@/lib/access-log";
import { ArrowLeft, MessageSquare } from "lucide-react";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function EditCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getPanelLocale();
  const t = await getTranslations({ locale, namespace: "admin.caseForm" });
  const tMsg = await getTranslations({ locale, namespace: "admin.messages" });
  const user = await requireStaff();

  const [caseRecord, clients, staff] = await Promise.all([
    db.case.findUnique({
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
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    }),
    db.user.findMany({
      where: { role: "CLIENT" },
      select: { id: true, email: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }],
    }),
    db.user.findMany({
      where: { role: { in: ["STAFF", "ADMIN"] } },
      select: { id: true, email: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }],
    }),
  ]);

  if (!caseRecord) notFound();

  void logAccess({
    userId: user.id,
    caseId: caseRecord.id,
    action: "VIEW_CASE",
  });

  return (
    <>
      <AdminHeader user={user} active="cases" />
      <Container className="py-10 md:py-14">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary/60 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("editTitle")}
        </Link>

        <h1 className="mt-4 font-display text-3xl font-extrabold text-primary">
          {caseRecord.title}
        </h1>

        <div className="mt-10 grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-8">
            <section className="rounded-2xl border border-primary/10 bg-white p-8 shadow-sm">
              <h2 className="mb-6 font-display text-lg font-bold text-primary">
                {t("section.basics")}
              </h2>
              <CaseForm
                mode="edit"
                initialCase={caseRecord}
                clients={clients}
                staff={staff}
              />
            </section>

            <section className="rounded-2xl border border-primary/10 bg-white p-8 shadow-sm">
              <h2 className="mb-6 font-display text-lg font-bold text-primary">
                {t("section.events")}
              </h2>
              <EventsManager caseId={caseRecord.id} events={caseRecord.events} />
            </section>

            <section className="rounded-2xl border border-primary/10 bg-white p-8 shadow-sm">
              <h2 className="mb-6 flex items-center gap-2 font-display text-lg font-bold text-primary">
                <MessageSquare className="h-5 w-5 text-accent" />
                {tMsg("title")}
              </h2>
              <AdminCaseMessages
                caseId={caseRecord.id}
                messages={caseRecord.messages}
                currentUserId={user.id}
              />
            </section>
          </div>

          <aside className="space-y-8">
            <section className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
              <h2 className="mb-5 font-display text-lg font-bold text-primary">
                {t("section.documents")}
              </h2>
              <DocumentsManager
                caseId={caseRecord.id}
                documents={caseRecord.documents}
              />
            </section>
          </aside>
        </div>
      </Container>
    </>
  );
}
