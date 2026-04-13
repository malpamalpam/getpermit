import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ClientForm } from "./ClientForm";
import { requireStaff } from "@/lib/auth";
import { getPanelLocale } from "@/lib/panel-locale";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function NewClientPage() {
  const locale = await getPanelLocale();
  const t = await getTranslations({ locale, namespace: "admin.clientForm" });
  const user = await requireStaff();

  return (
    <>
      <AdminHeader user={user} active="clients" />
      <Container className="py-10 md:py-14">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/admin/klienci"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary/60 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("title")}
          </Link>
          <h1 className="mt-4 font-display text-3xl font-extrabold text-primary">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-ink/60">{t("subtitle")}</p>

          <div className="mt-8 rounded-2xl border border-primary/10 bg-white p-8 shadow-card md:p-10">
            <ClientForm />
          </div>
        </div>
      </Container>
    </>
  );
}
