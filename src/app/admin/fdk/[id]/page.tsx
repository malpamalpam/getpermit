import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ArrowLeft, Eye, Download, FileText } from "lucide-react";
import { FdkUploadForm } from "@/components/admin/fdk/FdkUploadForm";

export const metadata = { robots: { index: false, follow: false } };

const TABS = [
  { key: "overview", label: "Przegląd" },
  { key: "bases", label: "Podstawy zatrudnienia" },
  { key: "hr", label: "Dane HR" },
  { key: "documents", label: "Dokumenty" },
  { key: "attachments", label: "Załączniki" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TYPE_BADGES: Record<string, { label: string; cls: string }> = {
  ZEZWOLENIE: { label: "Zezwolenie", cls: "bg-blue-100 text-blue-800" },
  OSWIADCZENIE: { label: "Oświadczenie", cls: "bg-green-100 text-green-800" },
  KARTA_POBYTU: { label: "Karta pobytu", cls: "bg-yellow-100 text-yellow-800" },
  BLUE_CARD: { label: "Blue Card", cls: "bg-purple-100 text-purple-800" },
  ZGLOSZENIE_UA: { label: "Zgłoszenie UA", cls: "bg-pink-100 text-pink-800" },
};

const STATUS_COLORS: Record<string, string> = {
  AKTYWNE: "bg-green-100 text-green-800",
  WYGASLE: "bg-red-100 text-red-800",
  UCHYLONE: "bg-red-100 text-red-800",
  UMORZONE: "bg-red-100 text-red-800",
  ZAKONCZONE: "bg-emerald-100 text-emerald-800",
  W_TRAKCIE: "bg-yellow-100 text-yellow-800",
  BRAK_DANYCH: "bg-gray-100 text-gray-600",
};

function fmt(d: Date | null | undefined): string {
  return d ? d.toLocaleDateString("pl-PL") : "—";
}

export default async function FdkForeignerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireAdmin();
  const { id: idStr } = await params;
  const sp = await searchParams;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();

  const foreigner = await db.fdkForeigner.findUnique({
    where: { id },
    include: {
      employmentBases: { orderBy: { dataOd: "desc" } },
      hrContracts: { include: { monthlyEntries: { orderBy: { miesiac: "asc" } } }, orderBy: { rok: "desc" } },
      detailedDocuments: { orderBy: { createdAt: "desc" } },
      attachments: { orderBy: [{ kategoria: "asc" }, { uploadedAt: "asc" }] },
    },
  });

  if (!foreigner) notFound();

  const activeTab: TabKey = TABS.some((t) => t.key === sp.tab) ? (sp.tab as TabKey) : "overview";

  return (
    <>
      <AdminHeader user={user} active="fdk" />
      <Container className="py-8">
        {/* Back + title */}
        <div className="mb-6">
          <Link href="/admin/fdk" className="mb-2 inline-flex items-center gap-1 text-sm text-accent hover:underline">
            <ArrowLeft className="h-4 w-4" /> Lista cudzoziemców
          </Link>
          <h1 className="font-display text-3xl font-extrabold text-primary">
            {foreigner.imie} {foreigner.nazwisko}
          </h1>
          {foreigner.obywatelstwo && (
            <p className="mt-1 text-sm text-ink/60">{foreigner.obywatelstwo}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-1 overflow-x-auto border-b border-primary/10">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={`/admin/fdk/${id}?tab=${tab.key}`}
              className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-accent text-accent"
                  : "border-transparent text-primary/60 hover:text-primary"
              }`}
            >
              {tab.label}
              {tab.key === "bases" && foreigner.employmentBases.length > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold">
                  {foreigner.employmentBases.length}
                </span>
              )}
              {tab.key === "attachments" && foreigner.attachments.length > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold">
                  {foreigner.attachments.length}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "overview" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-primary/10 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-display text-lg font-bold text-primary">Dane osobowe</h2>
              <dl className="space-y-2 text-sm">
                {[
                  ["Imię i nazwisko", `${foreigner.imie ?? ""} ${foreigner.nazwisko}`],
                  ["Data urodzenia", fmt(foreigner.dataUrodzenia)],
                  ["Miejsce urodzenia", foreigner.miejsceUrodzenia],
                  ["Obywatelstwo", foreigner.obywatelstwo],
                  ["Płeć", foreigner.plec],
                  ["PESEL", foreigner.pesel],
                  ["Nr paszportu", foreigner.nrPaszportu],
                  ["Paszport ważny", foreigner.paszportWaznyOd || foreigner.paszportWaznyDo ? `${fmt(foreigner.paszportWaznyOd)} – ${fmt(foreigner.paszportWaznyDo)}` : null],
                  ["Adres w PL", foreigner.adresPl],
                  ["Telefon", foreigner.telefon],
                  ["Email", foreigner.email],
                  ["Nr konta", foreigner.nrKonta],
                ].map(([label, value]) =>
                  value ? (
                    <div key={label as string} className="flex justify-between gap-4">
                      <dt className="text-primary/60">{label}</dt>
                      <dd className="text-right font-medium text-primary">{value}</dd>
                    </div>
                  ) : null
                )}
              </dl>
            </div>
            <div className="rounded-xl border border-primary/10 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-display text-lg font-bold text-primary">Podsumowanie</h2>
              <div className="space-y-3">
                <div className="text-sm text-primary/60">Podstawy zatrudnienia</div>
                <div className="flex flex-wrap gap-1.5">
                  {foreigner.employmentBases.length === 0 && <span className="text-sm text-primary/40">Brak</span>}
                  {[...new Set(foreigner.employmentBases.map((b) => b.typ))].map((t) => (
                    <span key={t} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TYPE_BADGES[t]?.cls ?? "bg-gray-100"}`}>
                      {TYPE_BADGES[t]?.label ?? t}
                    </span>
                  ))}
                </div>
                <div className="text-sm text-primary/60">Załączniki: {foreigner.attachments.length}</div>
                <div className="text-sm text-primary/60">Kontrakty HR: {foreigner.hrContracts.length}</div>
                <div className="text-sm text-primary/60">Dokumenty szczegółowe: {foreigner.detailedDocuments.length}</div>
              </div>
              {foreigner.uwagi && (
                <div className="mt-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                  <strong>Uwagi:</strong> {foreigner.uwagi}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "bases" && (
          <div className="space-y-4">
            {foreigner.employmentBases.length === 0 && (
              <p className="py-12 text-center text-primary/40">Brak podstaw zatrudnienia</p>
            )}
            {foreigner.employmentBases.map((b) => (
              <div key={b.id} className="rounded-xl border border-primary/10 bg-white p-6 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TYPE_BADGES[b.typ]?.cls ?? "bg-gray-100"}`}>
                    {TYPE_BADGES[b.typ]?.label ?? b.typ}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[b.status] ?? STATUS_COLORS.BRAK_DANYCH}`}>
                    {b.status.replace("_", " ")}
                  </span>
                  {b.nrDecyzji && <span className="text-xs text-primary/50">Nr: {b.nrDecyzji}</span>}
                </div>
                <dl className="grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
                  {[
                    ["Okres", b.dataOd || b.dataDo ? `${fmt(b.dataOd)} – ${fmt(b.dataDo)}` : null],
                    ["Rodzaj umowy", b.rodzajUmowy],
                    ["Firma", b.firma],
                    ["Stanowisko", b.stanowisko],
                    ["Urząd", b.urzad],
                    ["Rodzaj sprawy", b.rodzajSprawy],
                    ["Sygnatura", b.sygnatura],
                    ["Nr oświadczenia", b.nrOswiadczenia],
                    ["Wezwanie/braki", b.wezwanieBraki],
                    ["Uwagi", b.uwagi],
                  ].map(([label, value]) =>
                    value ? (
                      <div key={label as string}>
                        <dt className="text-primary/50">{label}</dt>
                        <dd className="font-medium text-primary">{value}</dd>
                      </div>
                    ) : null
                  )}
                </dl>
              </div>
            ))}
          </div>
        )}

        {activeTab === "hr" && (
          <div className="space-y-6">
            {foreigner.hrContracts.length > 0 && (
              <div className="flex justify-end">
                <a
                  href="/api/fdk/export-hr"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/15 bg-white px-3 py-1.5 text-xs font-medium text-primary shadow-sm hover:bg-primary/5"
                >
                  <FileText className="h-3.5 w-3.5" /> Eksport CSV
                </a>
              </div>
            )}
            {foreigner.hrContracts.length === 0 && (
              <p className="py-12 text-center text-primary/40">Brak danych HR</p>
            )}
            {foreigner.hrContracts.map((c) => (
              <div key={c.id} className="rounded-xl border border-primary/10 bg-white p-6 shadow-sm">
                <h3 className="mb-3 font-display text-lg font-bold text-primary">
                  Kontrakt {c.rok} — {c.rodzajUmowy}
                </h3>
                <dl className="grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
                  {[
                    ["Okres", `${fmt(c.dataOd)} – ${fmt(c.dataDo)}`],
                    ["Rodzaj umowy", c.rodzajUmowy],
                    ["KUP", c.kup ? `${Number(c.kup) * 100}%` : null],
                    ["Kwota brutto min.", c.kwotaBruttoMin ? `${Number(c.kwotaBruttoMin).toLocaleString("pl-PL")} PLN` : null],
                    ["Kwota całościowa", c.kwotaCalosciowa ? `${Number(c.kwotaCalosciowa).toLocaleString("pl-PL")} PLN` : null],
                    ["Stanowisko", c.stanowisko],
                  ].map(([label, value]) =>
                    value ? (
                      <div key={label as string}>
                        <dt className="text-primary/50">{label}</dt>
                        <dd className="font-medium text-primary">{value}</dd>
                      </div>
                    ) : null
                  )}
                </dl>
              </div>
            ))}
          </div>
        )}

        {activeTab === "documents" && (
          <div className="space-y-4">
            {foreigner.detailedDocuments.length === 0 && (
              <p className="py-12 text-center text-primary/40">Brak dokumentów szczegółowych</p>
            )}
            {foreigner.detailedDocuments.map((doc) => {
              const dane = doc.dane as Record<string, unknown>;
              return (
                <div key={doc.id} className="rounded-xl border border-primary/10 bg-white p-6 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                      {doc.typDokumentu.replace(/_/g, " ")}
                    </span>
                  </div>
                  <dl className="grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
                    {Object.entries(dane)
                      .filter(([, v]) => v !== null && v !== undefined && !Array.isArray(v) && typeof v !== "object")
                      .map(([key, value]) => (
                        <div key={key}>
                          <dt className="text-primary/50">{key}</dt>
                          <dd className="font-medium text-primary">{String(value)}</dd>
                        </div>
                      ))}
                  </dl>
                  {/* Chronologia (np. TRC) */}
                  {Array.isArray(dane.chronologia) && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-semibold text-primary/70">Chronologia</h4>
                      <ol className="space-y-1.5 border-l-2 border-accent/20 pl-4 text-sm">
                        {(dane.chronologia as Array<{ data: string; opis: string }>).map((e, i) => (
                          <li key={i} className="relative">
                            <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-accent" />
                            <span className="font-medium text-primary/60">{e.data}</span>
                            <span className="ml-2 text-primary">{e.opis}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "attachments" && (
          <div className="space-y-6">
            {foreigner.attachments.length === 0 && (
              <p className="py-12 text-center text-primary/40">Brak załączników</p>
            )}
            {(() => {
              const groups = new Map<string, typeof foreigner.attachments>();
              for (const a of foreigner.attachments) {
                const list = groups.get(a.kategoria) ?? [];
                list.push(a);
                groups.set(a.kategoria, list);
              }
              const CATEGORY_LABELS: Record<string, string> = {
                glowne: "Dokumenty główne",
                wp_2023: "WP 2023",
                wp_2024: "WP 2024",
                trc_2024: "TRC 2024",
              };
              return Array.from(groups.entries()).map(([cat, files]) => (
                <div key={cat}>
                  <h3 className="mb-3 font-display text-lg font-bold text-primary">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {files.map((f) => (
                      <div key={f.id} className="flex items-start gap-3 rounded-lg border border-primary/10 bg-white p-4 shadow-sm">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-xs font-bold uppercase text-accent">
                          {f.typPliku}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-primary">{f.nazwaWyswietlana}</p>
                          {f.opis && <p className="mt-0.5 text-xs text-primary/50">{f.opis}</p>}
                          <div className="mt-2 flex gap-2">
                            <a
                              href={`/api/fdk/attachments/${f.id}?action=preview`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent/20"
                            >
                              <Eye className="h-3 w-3" /> Podgląd
                            </a>
                            <a
                              href={`/api/fdk/attachments/${f.id}?action=download`}
                              className="inline-flex items-center gap-1 rounded-md bg-primary/5 px-2 py-1 text-[11px] font-medium text-primary/70 hover:bg-primary/10"
                            >
                              <Download className="h-3 w-3" /> Pobierz
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
            <FdkUploadForm foreignerId={foreigner.id} />
          </div>
        )}
      </Container>
    </>
  );
}
