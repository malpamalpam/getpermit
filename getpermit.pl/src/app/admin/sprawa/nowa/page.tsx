import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CaseForm } from "@/components/admin/CaseForm";
import { requireStaff } from "@/lib/auth";
import { getPanelLocale } from "@/lib/panel-locale";
import { db } from "@/lib/db";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function NewCasePage() {
  const locale = await getPanelLocale();
  const t = await getTranslations({ locale, namespace: "admin.caseForm" });
  const user = await requireStaff();

  const [clients, staff] = await Promise.all([
    db.user.findMany({
      where: { role: "CLIENT" },
      select: { id: true, email: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { email: "asc" }],
    }),
    db.user.findMany({
      where: { role: { in: ["STAFF", "ADMIN"] } },
      select: { id: true, email: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }],
    }),
  ]);

  return (
    <>
      <AdminHeader user={user} active="cases" />
      <Container className="py-10 md:py-14">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-3xl font-extrabold text-primary">
            {t("newTitle")}
          </h1>
          <div className="mt-8 rounded-2xl border border-primary/10 bg-white p-8 shadow-card">
            <CaseForm mode="create" clients={clients} staff={staff} />
          </div>
        </div>
      </Container>
    </>
  );
}
