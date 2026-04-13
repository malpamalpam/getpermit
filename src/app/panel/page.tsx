import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { PanelHeader } from "@/components/panel/PanelHeader";
import { CaseCard } from "@/components/panel/CaseCard";
import { requireUser } from "@/lib/auth";
import { getPanelLocale } from "@/lib/panel-locale";
import { db } from "@/lib/db";
import { Inbox, Mail } from "lucide-react";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function PanelDashboardPage() {
  const locale = await getPanelLocale();
  const t = await getTranslations({ locale, namespace: "panel.dashboard" });
  const user = await requireUser();

  const cases = await db.case.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

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
