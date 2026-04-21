import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusBadge } from "@/components/panel/StatusBadge";
import { requireStaff } from "@/lib/auth";
import { getPanelLocale } from "@/lib/panel-locale";
import { db } from "@/lib/db";
import { CaseStatus, CaseType } from "@prisma/client";
import { Plus, Search } from "lucide-react";

export const metadata = {
  robots: { index: false, follow: false },
};

interface SearchParams {
  q?: string;
  status?: string;
  type?: string;
  staff?: string;
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default async function AdminCasesListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const locale = await getPanelLocale();
  const t = await getTranslations({ locale, namespace: "admin.casesList" });
  const tType = await getTranslations({ locale, namespace: "caseType" });
  const tStatus = await getTranslations({ locale, namespace: "caseStatus" });

  const user = await requireStaff();

  // Build where clause
  const where: Record<string, unknown> = {};
  if (sp.status && sp.status in CaseStatus) where.status = sp.status;
  if (sp.type && sp.type in CaseType) where.type = sp.type;
  if (sp.staff === "unassigned") where.assignedStaffId = null;
  else if (sp.staff) where.assignedStaffId = sp.staff;

  if (sp.q) {
    const q = sp.q.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { firstName: { contains: q, mode: "insensitive" } } },
      { user: { lastName: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [cases, allStaff] = await Promise.all([
    db.case.findMany({
      where,
      include: { user: true, assignedStaff: true },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    db.user.findMany({
      where: { role: { in: ["STAFF", "ADMIN"] } },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return (
    <>
      <AdminHeader user={user} active="cases" />
      <Container className="py-10 md:py-14">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-primary md:text-4xl">
              {t("title")}
            </h1>
            <p className="mt-2 text-base text-ink/60">{t("subtitle")}</p>
          </div>
          <Link href="/admin/sprawa/nowa">
            <Button variant="accent" size="md">
              <Plus className="h-4 w-4" />
              {t("createButton")}
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <form
          method="GET"
          className="mb-6 grid gap-3 rounded-2xl border border-primary/10 bg-white p-4 md:grid-cols-[1fr_auto_auto_auto_auto]"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/40" />
            <input
              type="text"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder={t("filters.search")}
              className="w-full rounded-md border border-primary/15 bg-white py-2 pl-9 pr-3 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <select
            name="status"
            defaultValue={sp.status ?? ""}
            className="rounded-md border border-primary/15 bg-white px-3 py-2 text-sm text-primary"
          >
            <option value="">{t("filters.all")} — {t("filters.status")}</option>
            {Object.values(CaseStatus).map((s) => (
              <option key={s} value={s}>
                {tStatus(s)}
              </option>
            ))}
          </select>
          <select
            name="type"
            defaultValue={sp.type ?? ""}
            className="rounded-md border border-primary/15 bg-white px-3 py-2 text-sm text-primary"
          >
            <option value="">{t("filters.all")} — {t("filters.type")}</option>
            {Object.values(CaseType).map((ty) => (
              <option key={ty} value={ty}>
                {tType(ty)}
              </option>
            ))}
          </select>
          <select
            name="staff"
            defaultValue={sp.staff ?? ""}
            className="rounded-md border border-primary/15 bg-white px-3 py-2 text-sm text-primary"
          >
            <option value="">{t("filters.all")} — {t("filters.staff")}</option>
            <option value="unassigned">{t("filters.unassigned")}</option>
            {allStaff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName ?? s.email}
              </option>
            ))}
          </select>
          <Button type="submit" variant="primary" size="sm">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        {/* Cases table */}
        {cases.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-primary/20 bg-white p-10 text-center">
            <p className="text-sm text-ink/60">{t("noResults")}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-primary/10 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-primary/10 bg-surface text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                <tr>
                  <th className="px-4 py-3">{t("columns.title")}</th>
                  <th className="px-4 py-3">{t("columns.client")}</th>
                  <th className="px-4 py-3">{t("columns.status")}</th>
                  <th className="px-4 py-3">{t("columns.type")}</th>
                  <th className="px-4 py-3">{t("columns.staff")}</th>
                  <th className="px-4 py-3">{t("columns.updated")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {cases.map((c) => {
                  const caseUrl = `/admin/sprawa/${c.id}`;
                  const cellCls = "px-4 py-3";
                  return (
                  <tr
                    key={c.id}
                    className="group cursor-pointer transition-colors hover:bg-surface"
                  >
                    <td className={cellCls}>
                      <Link href={caseUrl} className="font-medium text-primary group-hover:text-accent">
                        {c.title}
                      </Link>
                    </td>
                    <td className={cellCls}>
                      <Link href={caseUrl} className="block text-primary/80">
                      {c.user.firstName || c.user.lastName
                        ? `${c.user.firstName ?? ""} ${c.user.lastName ?? ""}`.trim()
                        : c.user.email}
                      </Link>
                    </td>
                    <td className={cellCls}>
                      <Link href={caseUrl} className="block">
                      <StatusBadge status={c.status} />
                      </Link>
                    </td>
                    <td className={`${cellCls} text-xs text-primary/70`}>
                      <Link href={caseUrl} className="block">
                      {tType(c.type)}
                      </Link>
                    </td>
                    <td className={`${cellCls} text-xs text-primary/70`}>
                      <Link href={caseUrl} className="block">
                      {c.assignedStaff
                        ? c.assignedStaff.firstName ?? c.assignedStaff.email
                        : "—"}
                      </Link>
                    </td>
                    <td className={`${cellCls} text-xs text-primary/50`}>
                      <Link href={caseUrl} className="block">
                      {formatDate(c.updatedAt)}
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
