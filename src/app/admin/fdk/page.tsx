import { Container } from "@/components/ui/Container";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, Users, Paperclip, Download } from "lucide-react";
import { DeleteForeignerButton } from "@/components/admin/fdk/DeleteForeignerButton";
import { withComputedStatuses, computeResidenceStatus, getCurrentEmploymentBasis, type ResidenceStatus } from "@/lib/fdk-queries";

export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const VALID_PER_PAGE = [50, 100, 200];

const STATUS_COLORS: Record<string, string> = {
  AKTYWNE: "bg-green-100 text-green-800",
  WYGASLE: "bg-red-100 text-red-800",
  UCHYLONE: "bg-red-100 text-red-800",
  UMORZONE: "bg-red-100 text-red-800",
  W_TRAKCIE: "bg-yellow-100 text-yellow-800",
  BRAK_DANYCH: "bg-gray-100 text-gray-600",
};

const RESIDENCE_BADGES: Record<ResidenceStatus, { label: string; cls: string }> = {
  aktualna: { label: "Aktualna", cls: "bg-green-100 text-green-800" },
  wygasla: { label: "Wygasła", cls: "bg-red-100 text-red-800" },
  w_procedurze: { label: "W procedurze", cls: "bg-amber-100 text-amber-800" },
  brak: { label: "Brak", cls: "bg-gray-100 text-gray-500" },
};

const TYPE_BADGES: Record<string, { label: string; cls: string }> = {
  ZEZWOLENIE: { label: "Zezwolenie", cls: "bg-blue-100 text-blue-800" },
  OSWIADCZENIE: { label: "Oświadczenie", cls: "bg-green-100 text-green-800" },
  KARTA_POBYTU: { label: "Karta pobytu", cls: "bg-yellow-100 text-yellow-800" },
  BLUE_CARD: { label: "Blue Card", cls: "bg-purple-100 text-purple-800" },
  ZGLOSZENIE_UA: { label: "Zgłoszenie UA", cls: "bg-pink-100 text-pink-800" },
  DOSTEP_UE: { label: "Dostęp UE", cls: "bg-emerald-100 text-emerald-800" },
  DOSTEP_STUDENT: { label: "Student", cls: "bg-emerald-100 text-emerald-800" },
  DOSTEP_POBYT_STALY: { label: "Pobyt stały", cls: "bg-emerald-100 text-emerald-800" },
  DOSTEP_REZYDENT_UE: { label: "Rezydent UE", cls: "bg-emerald-100 text-emerald-800" },
  DOSTEP_KARTA_POLAKA: { label: "Karta Polaka", cls: "bg-emerald-100 text-emerald-800" },
  DOSTEP_OCHRONA_MIEDZ: { label: "Ochrona międz.", cls: "bg-emerald-100 text-emerald-800" },
  DOSTEP_DYPLOM_PL: { label: "Otwarty dostęp", cls: "bg-emerald-100 text-emerald-800" },
};

export default async function FdkPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireAdmin();
  const sp = await searchParams;

  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const typeFilter = sp.type ?? "";
  const statusFilter = sp.status ?? "";
  const pobytFilter = sp.pobyt ?? "";
  const rawPerPage = parseInt(sp.perPage ?? "50", 10);
  const PAGE_SIZE = VALID_PER_PAGE.includes(rawPerPage) ? rawPerPage : 50;

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

  // --- Query ---
  const skip = (page - 1) * PAGE_SIZE;
  let foreigners = pobytFilter
    ? await db.fdkForeigner.findMany({
        where: where as never,
        include: {
          employmentBases: { orderBy: [{ status: "asc" }, { dataDo: "desc" }] },
          _count: { select: { attachments: true } },
        },
        orderBy: { nazwisko: "asc" },
      })
    : await db.fdkForeigner.findMany({
        where: where as never,
        include: {
          employmentBases: { orderBy: [{ status: "asc" }, { dataDo: "desc" }] },
          _count: { select: { attachments: true } },
        },
        orderBy: { nazwisko: "asc" },
        skip,
        take: PAGE_SIZE,
      });

  // Recompute statuses from dates
  for (const f of foreigners) {
    f.employmentBases = withComputedStatuses(f.employmentBases);
  }

  // Residence filter (app-level — computed from multiple fields)
  if (pobytFilter) {
    foreigners = foreigners.filter((f) => {
      try { return computeResidenceStatus(f) === pobytFilter; } catch { return false; }
    });
  }

  const total = pobytFilter ? foreigners.length : await db.fdkForeigner.count({ where: where as never });

  // Paginate after filter if needed
  if (pobytFilter) {
    foreigners = foreigners.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function buildUrl(params: Record<string, string>) {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (typeFilter) u.set("type", typeFilter);
    if (statusFilter) u.set("status", statusFilter);
    if (pobytFilter) u.set("pobyt", pobytFilter);
    if (PAGE_SIZE !== 50) u.set("perPage", String(PAGE_SIZE));
    Object.entries(params).forEach(([k, v]) => v ? u.set(k, v) : u.delete(k));
    return `/admin/fdk?${u.toString()}`;
  }

  return (
    <>
      <AdminHeader user={user} active="fdk" />
      <Container className="py-8">
        {/* Stats */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-extrabold text-primary">Sprawy FDK</h1>
              <p className="text-sm text-ink/60">{total} cudzoziemców{pobytFilter || typeFilter || statusFilter || q ? " (filtr)" : " w bazie"}</p>
            </div>
          </div>
          <a
            href="/api/fdk/export-hr"
            className="inline-flex items-center gap-2 rounded-lg border border-primary/15 bg-white px-4 py-2 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-primary/5"
          >
            <Download className="h-4 w-4" />
            Eksport HR (CSV)
          </a>
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

          {/* Type filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-primary/50">Typ:</label>
            {[
              { value: "", label: "Wszystkie" },
              { value: "ZEZWOLENIE", label: "Zezwolenie" },
              { value: "OSWIADCZENIE", label: "Oświadczenie" },
              { value: "KARTA_POBYTU", label: "Karta pobytu" },
              { value: "BLUE_CARD", label: "Blue Card" },
              { value: "ZGLOSZENIE_UA", label: "Zgłoszenie UA" },
              { value: "DOSTEP_UE", label: "Dostęp UE" },
            ].map((opt) => (
              <a
                key={opt.value}
                href={buildUrl({ type: opt.value, page: "1" })}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  typeFilter === opt.value
                    ? "bg-accent text-white"
                    : "bg-primary/5 text-primary/70 hover:bg-primary/10"
                }`}
              >
                {opt.label}
              </a>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-primary/50">Status:</label>
            {[
              { value: "", label: "Wszystkie" },
              { value: "AKTYWNE", label: "Aktywne" },
              { value: "WYGASLE", label: "Wygasłe" },
              { value: "W_TRAKCIE", label: "W trakcie" },
            ].map((opt) => (
              <a
                key={opt.value}
                href={buildUrl({ status: opt.value, page: "1" })}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  statusFilter === opt.value
                    ? "bg-accent text-white"
                    : "bg-primary/5 text-primary/70 hover:bg-primary/10"
                }`}
              >
                {opt.label}
              </a>
            ))}
          </div>

          {/* Residence basis filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-primary/50">Pobyt:</label>
            {[
              { value: "", label: "Wszystkie" },
              { value: "aktualna", label: "Aktualna" },
              { value: "wygasla", label: "Wygasła" },
              { value: "w_procedurze", label: "W procedurze" },
              { value: "brak", label: "Brak" },
            ].map((opt) => (
              <a
                key={opt.value}
                href={buildUrl({ pobyt: opt.value, page: "1" })}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  pobytFilter === opt.value
                    ? "bg-accent text-white"
                    : "bg-primary/5 text-primary/70 hover:bg-primary/10"
                }`}
              >
                {opt.label}
              </a>
            ))}
          </div>

          <a href="/admin/fdk" className="text-xs text-accent hover:underline">Wyczyść filtry</a>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-primary/10 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary/10 bg-surface text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Nazwisko</th>
                <th className="px-4 py-3">Imię</th>
                <th className="px-4 py-3">Podstawa pracy</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pobyt</th>
                <th className="px-4 py-3">Ważne do</th>
                <th className="px-4 py-3 text-center">
                  <Paperclip className="mx-auto h-4 w-4" />
                </th>
                <th className="px-4 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {foreigners.map((f, idx) => {
                // Use the same "best" basis for all columns (type, status, date)
                const bestBase = getCurrentEmploymentBasis(f.employmentBases);
                const latestStatus = bestBase?.status ?? "BRAK_DANYCH";
                const latestDate = bestBase?.dataDo ?? null;

                let rs: ResidenceStatus = "brak";
                try { rs = computeResidenceStatus(f); } catch { /* fallback */ }
                const resBadge = RESIDENCE_BADGES[rs];

                return (
                  <tr key={f.id} className="group relative cursor-pointer transition-colors hover:bg-accent/5">
                    <td className="px-4 py-3 text-primary/40">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-primary">
                      <Link href={`/admin/fdk/${f.id}`} className="hover:text-accent hover:underline after:absolute after:inset-0 after:content-['']">
                        {f.nazwisko}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-primary/70">{f.imie}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const best = getCurrentEmploymentBasis(f.employmentBases);
                        if (!best) {
                          return <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">Brak</span>;
                        }
                        const badge = TYPE_BADGES[best.typ];
                        const activeBases = f.employmentBases.filter(
                          (b) => b.status === "AKTYWNE" || b.status === "W_TRAKCIE"
                        );
                        return (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge?.cls ?? "bg-gray-100 text-gray-600"}`}
                            title={activeBases.map((b) => TYPE_BADGES[b.typ]?.label ?? b.typ).join(", ")}
                          >
                            {badge?.label ?? best.typ}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[latestStatus] ?? STATUS_COLORS.BRAK_DANYCH}`}>
                        {latestStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${resBadge.cls}`}>
                        {resBadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-primary/70">
                      {latestDate ? `${String(latestDate.getUTCDate()).padStart(2, "0")}.${String(latestDate.getUTCMonth() + 1).padStart(2, "0")}.${latestDate.getUTCFullYear()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-primary/40">
                      {f._count.attachments > 0 && (
                        <span className="text-xs font-medium text-accent">{f._count.attachments}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <DeleteForeignerButton foreignerId={f.id} name={`${f.imie ?? ""} ${f.nazwisko}`.trim()} />
                    </td>
                  </tr>
                );
              })}
              {foreigners.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-primary/40">Brak wyników</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination + page size */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-primary/60">Strona {page} z {totalPages || 1}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-primary/50">Pokaż:</span>
              {VALID_PER_PAGE.map((size) => (
                <a
                  key={size}
                  href={buildUrl({ perPage: size === 50 ? "" : String(size), page: "1" })}
                  className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                    PAGE_SIZE === size ? "bg-accent text-white" : "bg-primary/5 text-primary/70 hover:bg-primary/10"
                  }`}
                >
                  {size}
                </a>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={buildUrl({ page: String(page - 1) })} className="inline-flex items-center gap-1 rounded-md border border-primary/15 px-3 py-1.5 text-sm hover:bg-surface">
                <ChevronLeft className="h-4 w-4" /> Poprzednia
              </Link>
            )}
            {page < totalPages && (
              <Link href={buildUrl({ page: String(page + 1) })} className="inline-flex items-center gap-1 rounded-md border border-primary/15 px-3 py-1.5 text-sm hover:bg-surface">
                Następna <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}
