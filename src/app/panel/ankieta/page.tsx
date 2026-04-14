import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { PanelHeader } from "@/components/panel/PanelHeader";
import { PersonalDataForm } from "@/components/panel/PersonalDataForm";
import { requireUser } from "@/lib/auth";
import { getPanelLocale } from "@/lib/panel-locale";
import { db } from "@/lib/db";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function QuestionnairePage() {
  const locale = await getPanelLocale();
  const t = await getTranslations({ locale, namespace: "panel.questionnaire" });
  const user = await requireUser();

  const personalData = await db.personalData.findUnique({
    where: { userId: user.id },
  });

  return (
    <>
      <PanelHeader user={user} active="questionnaire" />
      <Container className="py-10 md:py-14">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-display text-3xl font-extrabold text-primary">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-ink/70">
            {t("subtitle")}
          </p>

          <div className="mt-8">
            <PersonalDataForm initialData={personalData} />
          </div>
        </div>
      </Container>
    </>
  );
}
