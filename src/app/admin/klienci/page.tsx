import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { requireStaff } from "@/lib/auth";
import { getPanelLocale } from "@/lib/panel-locale";
import { db } from "@/lib/db";
import { Plus, Search } from "lucide-react";

export const metadata = {
  robots: { index: false, follow: false },
};

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default async function ClientsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const locale = await getPanelLocale();
  const t = await getTranslations({ locale, namespace: "admin.clientsList" });
  const user = await requireStaff();

  const where: Record<string, unknown> = { role: "CLIENT" };
  if (sp.q) {
    const q = sp.q.trim();
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
    ];
  }

  const clients = await db.user.findMany({
    where,
    include: {
      _count: { select: { cases: true } },
    },
    orderBy: [{ lastName: "asc" }, { email: "asc" }],
    take: 200,
  });

  return (
    <>
      <AdminHeader user={user} active="clients" />
      <Container className="py-10 md:py-14">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-primary md:text-4xl">
              {t("title")}
            </h1>
            <p className="mt-2 text-base text-ink/60">{t("subtitle")}</p>
          </div>
          <Link href="/admin/klienci/nowy">
            <Button variant="accent" size="md">
              <Plus className="h-4 w-4" />
              {t("createButton")}
            </Button>
          </Link>
        </div>

        <form
          method="GET"
          className="mb-6 flex gap-3 rounded-2xl border border-primary/10 bg-white p-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/40" />
            <input
              type="text"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder={t("search")}
              className="w-full rounded-md border border-primary/15 bg-white py-2 pl-9 pr-3 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <Button type="submit" variant="primary" size="sm">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        {clients.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-primary/20 bg-white p-10 text-center">
            <p className="text-sm text-ink/60">{t("noResults")}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-primary/10 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-primary/10 bg-surface text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                <tr>
                  <th className="px-4 py-3">{t("columns.name")}</th>
                  <th className="px-4 py-3">{t("columns.email")}</th>
                  <th className="px-4 py-3">{t("columns.phone")}</th>
                  <th className="px-4 py-3">{t("columns.cases")}</th>
                  <th className="px-4 py-3">{t("columns.lastLogin")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {clients.map((c) => {
                  const fullName =
                    c.firstName || c.lastName
                      ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
                      : "—";
                  return (
                    <tr
                      key={c.id}
                      className="transition-colors hover:bg-surface"
                    >
                      <td className="px-4 py-3 font-medium text-primary">
                        <Link
                          href={`/admin/klienci/${c.id}`}
                          className="hover:text-accent hover:underline"
                        >
                          {fullName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-primary/80">{c.email}</td>
                      <td className="px-4 py-3 text-primary/70">
                        {c.phone ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-primary/70">
                        {c._count.cases}
                      </td>
                      <td className="px-4 py-3 text-xs text-primary/50">
                        {formatDate(c.lastLoginAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/sprawa/nowa?client=${c.id}`}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          {t("addCaseButton")}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Container>
    </>
  );
}
