import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { PanelHeader } from "@/components/panel/PanelHeader";
import { SettingsForm } from "./SettingsForm";
import { requireUser } from "@/lib/auth";
import { getPanelLocale } from "@/lib/panel-locale";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const locale = await getPanelLocale();
  const t = await getTranslations({ locale, namespace: "panel.settings" });
  const user = await requireUser();

  return (
    <>
      <PanelHeader user={user} active="settings" />
      <Container className="py-10 md:py-14">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-3xl font-extrabold text-primary">
            {t("title")}
          </h1>
          <p className="mt-3 text-base text-ink/60">{t("subtitle")}</p>

          <div className="mt-10 rounded-2xl border border-primary/10 bg-white p-8 shadow-card md:p-10">
            <SettingsForm user={user} />
          </div>
        </div>
      </Container>
    </>
  );
}
