import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { LoginForm } from "./LoginForm";
import { LogIn } from "lucide-react";
import { getPanelLocale } from "@/lib/panel-locale";

export async function generateMetadata() {
  const locale = await getPanelLocale();
  const t = await getTranslations({ locale, namespace: "panel.auth" });
  return {
    title: t("loginTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const locale = await getPanelLocale();
  const t = await getTranslations({ locale, namespace: "panel.auth" });

  const errorMap: Record<string, string> = {
    callback_failed: t("errorCallback"),
    missing_code: t("errorCallback"),
  };
  const initialError = sp.error ? errorMap[sp.error] ?? null : null;

  return (
    <Container className="py-16 md:py-24">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-primary/10 bg-white p-8 shadow-card md:p-10">
          <div className="mb-6 flex justify-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <LogIn className="h-7 w-7" />
            </span>
          </div>
          <h1 className="text-center font-display text-2xl font-extrabold text-primary md:text-3xl">
            {t("loginTitle")}
          </h1>
          <p className="mt-3 text-center text-sm text-ink/60">
            {t("loginSubtitle")}
          </p>

          <div className="mt-8">
            <LoginForm
              locale={locale}
              next={sp.next}
              initialError={initialError}
            />
          </div>
        </div>
      </div>
    </Container>
  );
}
