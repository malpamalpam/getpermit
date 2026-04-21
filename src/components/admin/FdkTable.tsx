"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Download, Search, Calendar, Table2 } from "lucide-react";

interface Permit {
  id: number;
  nazwisko: string;
  imie: string;
  typDokumentu: string;
  dataOd: string | null;
  dataDo: string | null;
  decyzjaOdebrana: string | null;
}

type Tab = "ZEZWOLENIE" | "OSWIADCZENIE" | "BLUE_CARD";
type View = "table" | "calendar";
type SortKey = "nazwisko" | "imie" | "dataOd" | "dataDo" | "decyzjaOdebrana" | "daysLeft";
type Filter = "all" | "active" | "expired";

function daysLeft(dataDo: string | null): number {
  if (!dataDo) return Infinity;
  return Math.ceil((new Date(dataDo).getTime() - Date.now()) / 86400000);
}

function getStatus(dataDo: string | null): "active" | "expired" | "expiring" {
  const d = daysLeft(dataDo);
  if (d < 0) return "expired";
  if (d <= 30) return "expiring";
  return "active";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pl-PL");
}

const TABS: { key: Tab; label: string }[] = [
  { key: "ZEZWOLENIE", label: "permits" },
  { key: "OSWIADCZENIE", label: "declarations" },
  { key: "BLUE_CARD", label: "blueCard" },
];

const PAGE_SIZE = 25;

export function FdkTable({ permits }: { permits: Permit[] }) {
  const t = useTranslations("admin.fdk");

  const [tab, setTab] = useState<Tab>("ZEZWOLENIE");
  const [view, setView] = useState<View>("table");
  const [filter, setFilter] = useState<Filter>("active");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("dataDo");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let data = permits.filter((p) => p.typDokumentu === tab);

    if (filter !== "all") {
      data = data.filter((p) => {
        const s = getStatus(p.dataDo);
        if (filter === "active") return s === "active" || s === "expiring";
        return s === "expired";
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) => p.nazwisko.toLowerCase().includes(q) || p.imie.toLowerCase().includes(q)
      );
    }

    data.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "daysLeft") {
        cmp = daysLeft(a.dataDo) - daysLeft(b.dataDo);
      } else if (sortKey === "nazwisko" || sortKey === "imie") {
        cmp = (a[sortKey] ?? "").localeCompare(b[sortKey] ?? "");
      } else {
        cmp = (a[sortKey] ?? "").localeCompare(b[sortKey] ?? "");
      }
      return sortAsc ? cmp : -cmp;
    });

    return data;
  }, [permits, tab, filter, search, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const exportCsv = () => {
    const isBlueCard = tab === "BLUE_CARD";
    const headers = isBlueCard
      ? ["ID", "Nazwisko", "Imię", "Decyzja odebrana", "Ważna do", "Status", "Dni"]
      : ["ID", "Nazwisko", "Imię", "Ważność od", "Ważność do", "Status", "Dni"];

    const rows = filtered.map((p) => [
      p.id,
      p.nazwisko,
      p.imie,
      isBlueCard ? formatDate(p.decyzjaOdebrana) : formatDate(p.dataOd),
      formatDate(p.dataDo),
      getStatus(p.dataDo),
      daysLeft(p.dataDo) === Infinity ? "—" : daysLeft(p.dataDo),
    ]);

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fdk_${tab.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " ↑" : " ↓") : "";

  const rowBg = (p: Permit) => {
    const s = getStatus(p.dataDo);
    if (s === "expired") return "bg-red-50";
    if (s === "expiring") return "bg-yellow-50";
    return "bg-green-50/50";
  };

  const statusBadge = (p: Permit) => {
    const s = getStatus(p.dataDo);
    const cls =
      s === "expired"
        ? "bg-red-100 text-red-700"
        : s === "expiring"
          ? "bg-yellow-100 text-yellow-700"
          : "bg-green-100 text-green-700";
    return (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
        {t(`status.${s}`)}
      </span>
    );
  };

  const isBlueCard = tab === "BLUE_CARD";

  // Calendar view
  const calendarData = useMemo(() => {
    const data = permits.filter((p) => p.typDokumentu === tab && p.dataDo);
    const months: Record<string, Permit[]> = {};
    data.forEach((p) => {
      const key = p.dataDo!.slice(0, 7);
      if (!months[key]) months[key] = [];
      months[key].push(p);
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b));
  }, [permits, tab]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-extrabold text-primary">{t("title")}</h1>
        <p className="mt-1 text-base text-ink/60">{t("subtitle")}</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-primary/10 pb-3">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => { setTab(tb.key); setPage(0); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === tb.key
                ? "bg-accent text-white"
                : "bg-white text-primary/70 hover:bg-primary/5"
            }`}
          >
            {t(`tabs.${tb.label}`)}
          </button>
        ))}

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setView("table")}
            className={`rounded-lg p-2 transition-colors ${view === "table" ? "bg-accent/10 text-accent" : "text-primary/40 hover:text-primary"}`}
          >
            <Table2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`rounded-lg p-2 transition-colors ${view === "calendar" ? "bg-accent/10 text-accent" : "text-primary/40 hover:text-primary"}`}
          >
            <Calendar className="h-4 w-4" />
          </button>
        </div>
      </div>

      {view === "calendar" ? (
        <div className="space-y-6">
          <h2 className="font-display text-xl font-bold text-primary">{t("calendarTitle")}</h2>
          {calendarData.map(([month, items]) => (
            <div key={month} className="rounded-xl border border-primary/10 bg-white p-4">
              <h3 className="mb-3 font-display text-base font-bold text-primary">
                {new Date(month + "-01").toLocaleDateString("pl-PL", { year: "numeric", month: "long" })}
              </h3>
              <div className="space-y-1">
                {items
                  .sort((a, b) => (a.dataDo ?? "").localeCompare(b.dataDo ?? ""))
                  .map((p) => {
                    const d = daysLeft(p.dataDo);
                    const color = d < 0 ? "text-red-600" : d <= 30 ? "text-yellow-600 font-bold" : "text-green-700";
                    return (
                      <div key={p.id} className={`flex items-center justify-between rounded px-2 py-1 text-sm ${d <= 30 && d >= 0 ? "bg-red-50" : ""}`}>
                        <span className="text-primary">
                          {p.nazwisko} {p.imie}
                        </span>
                        <span className={color}>
                          {formatDate(p.dataDo)} ({d < 0 ? `${Math.abs(d)}d temu` : `${d}d`})
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder={t("filters.search")}
                className="rounded-lg border border-primary/15 bg-white py-2 pl-9 pr-4 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>

            {(["all", "active", "expired"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(0); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f ? "bg-accent text-white" : "bg-white text-primary/60 hover:bg-primary/5"
                }`}
              >
                {t(`filters.${f}`)}
              </button>
            ))}

            <button
              onClick={exportCsv}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-primary/70 shadow-sm transition-colors hover:bg-primary/5"
            >
              <Download className="h-3.5 w-3.5" />
              {t("export")}
            </button>
          </div>

          {/* Count */}
          <p className="mb-2 text-xs text-primary/50">
            {t("totalRecords", { count: filtered.length })}
          </p>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-primary/10 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-primary/10 bg-surface/50 text-xs font-semibold uppercase tracking-wider text-primary/60">
                  <th className="cursor-pointer px-4 py-3" onClick={() => handleSort("nazwisko")}>
                    {t("columns.nazwisko")}{sortIndicator("nazwisko")}
                  </th>
                  <th className="cursor-pointer px-4 py-3" onClick={() => handleSort("imie")}>
                    {t("columns.imie")}{sortIndicator("imie")}
                  </th>
                  {isBlueCard ? (
                    <th className="cursor-pointer px-4 py-3" onClick={() => handleSort("decyzjaOdebrana")}>
                      {t("columns.decyzjaOdebrana")}{sortIndicator("decyzjaOdebrana")}
                    </th>
                  ) : (
                    <th className="cursor-pointer px-4 py-3" onClick={() => handleSort("dataOd")}>
                      {t("columns.dataOd")}{sortIndicator("dataOd")}
                    </th>
                  )}
                  <th className="cursor-pointer px-4 py-3" onClick={() => handleSort("dataDo")}>
                    {isBlueCard ? t("columns.waznaDo") : t("columns.dataDo")}{sortIndicator("dataDo")}
                  </th>
                  <th className="px-4 py-3">{t("columns.status")}</th>
                  <th className="cursor-pointer px-4 py-3" onClick={() => handleSort("daysLeft")}>
                    {t("columns.daysLeft")}{sortIndicator("daysLeft")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-primary/50">
                      {t("noResults")}
                    </td>
                  </tr>
                ) : (
                  paged.map((p) => (
                    <tr key={p.id} className={`border-b border-primary/5 ${rowBg(p)}`}>
                      <td className="px-4 py-2.5 font-medium text-primary">{p.nazwisko}</td>
                      <td className="px-4 py-2.5 text-primary/80">{p.imie}</td>
                      <td className="px-4 py-2.5 text-primary/70">
                        {isBlueCard ? formatDate(p.decyzjaOdebrana) : formatDate(p.dataOd)}
                      </td>
                      <td className="px-4 py-2.5 text-primary/70">{formatDate(p.dataDo)}</td>
                      <td className="px-4 py-2.5">{statusBadge(p)}</td>
                      <td className="px-4 py-2.5 text-primary/70">
                        {daysLeft(p.dataDo) === Infinity ? "—" : `${daysLeft(p.dataDo)}d`}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`rounded px-3 py-1 text-xs font-medium ${
                    page === i ? "bg-accent text-white" : "bg-white text-primary/60 hover:bg-primary/5"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
