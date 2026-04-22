import { Container } from "@/components/ui/Container";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, Users, Paperclip } from "lucide-react";

export const metadata = { robots: { index: false, follow: false } };

const PAGE_SIZE = 50;

const STATUS_COLORS: Record<string, string> = {
  AKTYWNE: "bg-green-100 text-green-800",
  WYGASLE: "bg-red-100 text-red-800",
  UCHYLONE: "bg-red-100 text-red-800",
  UMORZONE: "bg-red-100 text-red-800",
  ZAKONCZONE: "bg-emerald-100 text-emerald-800",
  W_TRAKCIE: "bg-yellow-100 text-yellow-800",
  BRAK_DANYCH: "bg-gray-100 text-gray-600",
};

const TYPE_BADGES: Record<string, { label: string; cls: string }> = {
  ZEZWOLENIE: { label: "Zezwolenie", cls: "bg-blue-100 text-blue-800" },
  OSWIADCZENIE: { label: "Oświadczenie", cls: "bg-green-100 text-green-800" },
  KARTA_POBYTU: { label: "Karta pobytu", cls: "bg-yellow-100 text-yellow-800" },
  BLUE_CARD: { label: "Blue Card", cls: "bg-purple-100 text-purple-800" },
  ZGLOSZENIE_UA: { label: "Zgłoszenie UA", cls: "bg-pink-100 text-pink-800" },
};

export default async function FdkPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; type?: string; status?: string }>;
}) {
  const user = await requireAdmin();
  const sp = await searchParams;

  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const typeFilter = sp.type ?? "";
  const statusFilter = sp.status ?? "";

  // Build where clause
  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { nazwisko: { contains: q, mode: "insensitive" } },
      { imie: { contains: q, mode: "insensitive" } },
      { pesel: { contains: q } },
    ];
  }
  if (typeFilter) {
    where.employmentBases = { some: { typ: typeFilter } };
  }
  if (statusFilter) {
    where.employmentBases = {
      ...((where.employmentBases as Record<string, unknown>) ?? {}),
      some: {
        ...((where.employmentBases as Record<string, Record<string, unknown>>)?.some ?? {}),
        status: statusFilter,
      },
    };
  }

  const [foreigners, total] = await Promise.all([
    db.fdkForeigner.findMany({
      where: where as never,
      include: {
        employmentBases: { orderBy: { dataDo: "desc" }, take: 5 },
        _count: { select: { attachments: true } },
      },
      orderBy: { nazwisko: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.fdkForeigner.count({ where: where as never }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function buildUrl(params: Record<string, string>) {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (typeFilter) u.set("type", typeFilter);
    if (statusFilter) u.set("status", statusFilter);
    Object.entries(params).forEach(([k, v]) => v ? u.set(k, v) : u.delete(k));
    return `/admin/fdk?${u.toString()}`;
  }

  return (
    <>
      <AdminHeader user={user} active="fdk" />
      <Container className="py-8">
        {/* Stats */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-primary">Sprawy FDK</h1>
            <p className="text-sm text-ink/60">{total} cudzoziemców w bazie</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <form className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/40" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Szukaj po nazwisku, imieniu, PESEL..."
              className="w-full rounded-lg border border-primary/15 bg-white py-2 pl-10 pr-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </form>
          <a
            href={buildUrl({ type: "", status: "", page: "1" })}
            className="text-xs text-accent hover:underline"
          >
            Wyczyść filtry
          </a>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-primary/10 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary/10 bg-surface text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Nazwisko</th>
                <th className="px-4 py-3">Imię</th>
                <th className="px-4 py-3">Podstawy zatrudnienia</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ważne do</th>
                <th className="px-4 py-3 text-center">
                  <Paperclip className="mx-auto h-4 w-4" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {foreigners.map((f, idx) => {
                const latestBase = f.employmentBases[0];
                const types = [...new Set(f.employmentBases.map((b) => b.typ))];
                const latestStatus = latestBase?.status ?? "BRAK_DANYCH";
                const latestDate = latestBase?.dataDo;

                return (
                  <tr key={f.id} className="transition-colors hover:bg-accent/5">
                    <td className="px-4 py-3 text-primary/40">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-primary">
                      <Link href={`/admin/fdk/${f.id}`} className="hover:text-accent hover:underline">
                        {f.nazwisko}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-primary/70">{f.imie}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {types.map((t) => (
                          <span
                            key={t}
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE_BADGES[t]?.cls ?? "bg-gray-100 text-gray-600"}`}
                          >
                            {TYPE_BADGES[t]?.label ?? t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[latestStatus] ?? STATUS_COLORS.BRAK_DANYCH}`}
                      >
                        {latestStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-primary/70">
                      {latestDate ? latestDate.toLocaleDateString("pl-PL") : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-primary/40">
                      {f._count.attachments > 0 && (
                        <span className="text-xs font-medium text-accent">{f._count.attachments}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {foreigners.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-primary/40">
                    Brak wyników
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-primary/60">
              Strona {page} z {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={buildUrl({ page: String(page - 1) })}
                  className="inline-flex items-center gap-1 rounded-md border border-primary/15 px-3 py-1.5 text-sm hover:bg-surface"
                >
                  <ChevronLeft className="h-4 w-4" /> Poprzednia
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildUrl({ page: String(page + 1) })}
                  className="inline-flex items-center gap-1 rounded-md border border-primary/15 px-3 py-1.5 text-sm hover:bg-surface"
                >
                  Następna <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        )}
      </Container>
    </>
  );
}
