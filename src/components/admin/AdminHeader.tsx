import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { signOutAction } from "@/lib/auth-actions";
import { Briefcase, Users, LogOut, ShieldCheck } from "lucide-react";
import type { User } from "@prisma/client";

interface Props {
  user: User;
  active?: "cases" | "clients";
}

export function AdminHeader({ user, active }: Props) {
  const t = useTranslations("admin.header");
  const tAuth = useTranslations("panel.auth");

  const linkClass = (key: "cases" | "clients") =>
    `inline-flex items-center gap-2 text-sm font-medium transition-colors ${
      active === key ? "text-primary" : "text-primary/60 hover:text-primary"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-primary/10 bg-white/95 backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link
              href="/admin"
              className="flex items-center gap-3 text-primary"
              aria-label="getpermit.pl admin"
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
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                <ShieldCheck className="h-3 w-3" />
                admin
              </span>
            </Link>

            <nav className="hidden items-center gap-6 md:flex">
              <Link href="/admin" className={linkClass("cases")}>
                <Briefcase className="h-4 w-4" />
                {t("cases")}
              </Link>
              <Link href="/admin/klienci" className={linkClass("clients")}>
                <Users className="h-4 w-4" />
                {t("clients")}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-ink/60 md:inline">
              {user.firstName ?? user.email}
            </span>
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

        <div className="flex items-center gap-6 border-t border-primary/5 py-2 md:hidden">
          <Link href="/admin" className={linkClass("cases")}>
            <Briefcase className="h-4 w-4" />
            {t("cases")}
          </Link>
          <Link href="/admin/klienci" className={linkClass("clients")}>
            <Users className="h-4 w-4" />
            {t("clients")}
          </Link>
        </div>
      </Container>
    </header>
  );
}
