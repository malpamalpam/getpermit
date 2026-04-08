import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { requireUser } from "@/lib/auth";
import { signOutAction } from "@/lib/auth-actions";
import { LogOut } from "lucide-react";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function PanelDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("panel.auth");

  const user = await requireUser();

  // TODO(Stage 3c): pełny dashboard z listą spraw klienta
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-2xl rounded-2xl border border-primary/10 bg-white p-10 shadow-card">
        <h1 className="font-display text-3xl font-extrabold text-primary">
          Witaj, {user.firstName ?? user.email}
        </h1>
        <p className="mt-3 text-base text-ink/60">
          Panel klienta jest w trakcie budowy. Niedługo zobaczysz tu listę
          swoich spraw legalizacyjnych, timeline wydarzeń i dokumenty do pobrania.
        </p>
        <div className="mt-3 text-xs uppercase tracking-wider text-ink/40">
          Email: {user.email} · Rola: {user.role}
        </div>

        <form action={signOutAction} className="mt-8">
          <Button type="submit" variant="outline" size="md">
            <LogOut className="h-4 w-4" />
            {t("logoutButton")}
          </Button>
        </form>
      </div>
    </Container>
  );
}
