import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { signOutAction } from "@/lib/auth-actions";
import { LayoutDashboard, Settings, ArrowLeft, LogOut } from "lucide-react";
import type { User } from "@prisma/client";

interface Props {
  user: User;
  active?: "dashboard" | "settings";
}

export function PanelHeader({ user, active }: Props) {
  const t = useTranslations("panel.header");
  const tAuth = useTranslations("panel.auth");

  const linkClass = (key: "dashboard" | "settings") =>
    `inline-flex items-center gap-2 text-sm font-medium transition-colors ${
      active === key
        ? "text-primary"
        : "text-primary/60 hover:text-primary"
    }`;

  const displayName =
    user.firstName ?? user.email.split("@")[0] ?? user.email;

  return (
    <header className="sticky top-0 z-40 border-b border-primary/10 bg-white/95 backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link
              href="/panel"
              className="flex items-center gap-3 text-primary"
              aria-label="getpermit.pl panel"
            >
              <Image
                src="/logo.svg"
                alt="getpermit.pl"
                width={40}
                height={28}
                className="h-6 w-auto"
              />
              <span className="font-display text-lg font-bold tracking-tight">
                get<span className="text-brand">permit</span>.pl
              </span>
            </Link>

            <nav className="hidden items-center gap-6 md:flex">
              <Link href="/panel" className={linkClass("dashboard")}>
                <LayoutDashboard className="h-4 w-4" />
                {t("dashboard")}
              </Link>
              <Link href="/panel/ustawienia" className={linkClass("settings")}>
                <Settings className="h-4 w-4" />
                {t("settings")}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-ink/60 md:inline">
              {displayName}
            </span>
            <Link
              href={`/${user.locale ?? "pl"}`}
              className="hidden text-xs font-medium text-primary/60 hover:text-primary md:inline-flex md:items-center md:gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              {t("backToSite")}
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md border border-primary/15 bg-white px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
              >
                <LogOut className="h-3.5 w-3.5" />
                {tAuth("logoutButton")}
              </button>
            </form>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="flex items-center gap-6 border-t border-primary/5 py-2 md:hidden">
          <Link href="/panel" className={linkClass("dashboard")}>
            <LayoutDashboard className="h-4 w-4" />
            {t("dashboard")}
          </Link>
          <Link href="/panel/ustawienia" className={linkClass("settings")}>
            <Settings className="h-4 w-4" />
            {t("settings")}
          </Link>
        </div>
      </Container>
    </header>
  );
}
