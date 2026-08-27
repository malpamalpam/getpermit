import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ArrowLeft, Eye, Download, FileText, Shield } from "lucide-react";
import { FdkUploadForm } from "@/components/admin/fdk/FdkUploadForm";
import { ScrapeButton } from "@/components/admin/fdk/ScrapeButton";
import { DeleteAttachmentButton } from "@/components/admin/fdk/DeleteAttachmentButton";
import { SendHrEmailButton } from "@/components/admin/fdk/SendHrEmailButton";
import { FdkEditForeignerForm } from "@/components/admin/fdk/FdkEditForeignerForm";
import { FdkChangeHistory } from "@/components/admin/fdk/FdkChangeHistory";
import { EmploymentBasesTab } from "@/components/admin/fdk/EmploymentBasesTab";
import { DeleteForeignerButton } from "@/components/admin/fdk/DeleteForeignerButton";
import { withComputedStatuses, computeResidenceStatus } from "@/lib/fdk-queries";

export const metadata = { robots: { index: false, follow: false } };

const TABS = [
  { key: "overview", label: "Przegląd" },
  { key: "bases", label: "Podstawy zatrudnienia" },
  { key: "hr", label: "Dane HR" },
  { key: "attachments", label: "Załączniki" },
  { key: "history", label: "Historia zmian" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TYPE_BADGES: Record<string, { label: string; cls: string }> = {
  ZEZWOLENIE: { label: "Zezwolenie", cls: "bg-blue-100 text-blue-800" },
  OSWIADCZENIE: { label: "Oświadczenie", cls: "bg-green-100 text-green-800" },
  KARTA_POBYTU: { label: "Karta pobytu", cls: "bg-yellow-100 text-yellow-800" },
  BLUE_CARD: { label: "EU Blue Card", cls: "bg-purple-100 text-purple-800" },
  ZGLOSZENIE_UA: { label: "Zgłoszenie UA", cls: "bg-pink-100 text-pink-800" },
  ODWOLANIE: { label: "Odwołanie", cls: "bg-orange-100 text-orange-800" },
  DOSTEP_UE: { label: "Dostęp UE", cls: "bg-emerald-100 text-emerald-800" },
  DOSTEP_STUDENT: { label: "Student", cls: "bg-emerald-100 text-emerald-800" },
  DOSTEP_POBYT_STALY: { label: "Pobyt stały", cls: "bg-emerald-100 text-emerald-800" },
  DOSTEP_REZYDENT_UE: { label: "Rezydent UE", cls: "bg-emerald-100 text-emerald-800" },
  DOSTEP_KARTA_POLAKA: { label: "Karta Polaka", cls: "bg-emerald-100 text-emerald-800" },
  DOSTEP_OCHRONA_MIEDZ: { label: "Ochrona międz.", cls: "bg-emerald-100 text-emerald-800" },
  DOSTEP_DYPLOM_PL: { label: "Otwarty dostęp", cls: "bg-emerald-100 text-emerald-800" },
};


function fmt(d: Date | null | undefined): string {
  if (!d) return "—";
  // Use UTC to avoid timezone shift (dates stored as midnight UTC)
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}.${month}.${year}`;
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
      attachments: { orderBy: [{ kategoria: "asc" }, { uploadedAt: "asc" }] },
      changeLogs: { orderBy: { changedAt: "desc" }, take: 200 },
    },
  });

  if (!foreigner) notFound();

  // Recompute statuses from dates
  foreigner.employmentBases = withComputedStatuses(foreigner.employmentBases);

  const activeTab: TabKey = TABS.some((t) => t.key === sp.tab) ? (sp.tab as TabKey) : "overview";

  // Check if foreigner has active residence permit (KARTA_POBYTU or BLUE_CARD)
  const now = new Date();
  const hasActiveResidence =
    (foreigner.decyzjaPobytowaDo && foreigner.decyzjaPobytowaDo > now) ||
    foreigner.upoDoreczone ||
    foreigner.ochronaCzasowaUkr ||
    foreigner.employmentBases.some(
      (b) => (b.typ === "KARTA_POBYTU" || b.typ === "BLUE_CARD") && b.status === "AKTYWNE" && b.dataDo && b.dataDo > now
    ) ||
    foreigner.employmentBases.some((b) => b.typ === "DOSTEP_UE" && b.status === "AKTYWNE");

  return (
    <>
      <AdminHeader user={user} active="fdk" />
      <Container className="py-8">
        {/* Back + title */}
        <div className="mb-6">
          <Link href="/admin/fdk" className="mb-2 inline-flex items-center gap-1 text-sm text-accent hover:underline">
            <ArrowLeft className="h-4 w-4" /> Lista cudzoziemców
          </Link>
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-display text-3xl font-extrabold text-primary">
              {foreigner.imie} {foreigner.nazwisko}
            </h1>
            <DeleteForeignerButton
              foreignerId={foreigner.id}
              name={`${foreigner.imie ?? ""} ${foreigner.nazwisko}`.trim()}
              redirectTo="/admin/fdk"
              variant="button"
            />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {foreigner.obywatelstwo && (
              <span className="text-sm text-ink/60">{foreigner.obywatelstwo}</span>
            )}
            {(() => {
              const rs = computeResidenceStatus(foreigner);
              if (rs === "w_procedurze") {
                return (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    <Shield className="h-3 w-3" /> W procedurze — przedłużenie TRC
                    {foreigner.upoDoreczone && <> (od {fmt(foreigner.upoDoreczone)})</>}
                  </span>
                );
              }
              if (rs === "aktualna") {
                const isEu = foreigner.employmentBases.some((b) => b.typ === "DOSTEP_UE" && b.status === "AKTYWNE");
                if (foreigner.ochronaCzasowaUkr) {
                  return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
                      <Shield className="h-3 w-3" /> Ochrona czasowa (UKR)
                    </span>
                  );
                }
                if (isEu) {
                  return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      <Shield className="h-3 w-3" /> Pobyt obywatela UE
                    </span>
                  );
                }
                const activeDate = foreigner.decyzjaPobytowaDo && foreigner.decyzjaPobytowaDo >= now
                  ? foreigner.decyzjaPobytowaDo
                  : foreigner.wizaDo && foreigner.wizaDo >= now ? foreigner.wizaDo : null;
                const docLabel = foreigner.wizaDo && foreigner.wizaDo >= now && !(foreigner.decyzjaPobytowaDo && foreigner.decyzjaPobytowaDo >= now)
                  ? "Wiza ważna" : "Karta pobytu ważna";
                return (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                    <Shield className="h-3 w-3" /> {docLabel}{activeDate && <> do {fmt(activeDate)}</>}
                  </span>
                );
              }
              if (rs === "wygasla") {
                return (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                    <Shield className="h-3 w-3" /> Brak aktualnej podstawy pobytowej
                  </span>
                );
              }
              // rs === "brak"
              return null;
            })()}
          </div>
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
              {tab.key === "history" && foreigner.changeLogs.length > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold">
                  {foreigner.changeLogs.length}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "overview" && (
          <div className="grid gap-6 md:grid-cols-2">
            <FdkEditForeignerForm foreigner={foreigner} />
            <div className="rounded-xl border border-primary/10 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-display text-lg font-bold text-primary">Podsumowanie</h2>
              <div className="space-y-3">
                {/* Podstawy pobytowe */}
                <div className="text-sm text-primary/60">Podstawy pobytowe</div>
                {(() => {
                  const kpExpired = foreigner.decyzjaPobytowaDo && foreigner.decyzjaPobytowaDo < now;
                  const kpActive = foreigner.decyzjaPobytowaDo && foreigner.decyzjaPobytowaDo >= now;
                  const wizaExpired = foreigner.wizaDo && foreigner.wizaDo < now;
                  const wizaActive = foreigner.wizaDo && foreigner.wizaDo >= now;
                  const hasUpo = !!foreigner.upoDoreczone;
                  const hasOchronaUkr = foreigner.ochronaCzasowaUkr;
                  const isEuCitizen = foreigner.employmentBases.some((b) => b.typ === "DOSTEP_UE" && b.status === "AKTYWNE");
                  const hasAny = kpActive || kpExpired || wizaActive || wizaExpired || hasUpo || hasOchronaUkr || isEuCitizen;

                  return (
                    <>
                      {/* Karta pobytu — aktywna */}
                      {kpActive && (
                        <div className="rounded-lg bg-blue-50 p-3 text-sm">
                          <div className="font-semibold text-blue-800">
                            Karta pobytu{foreigner.typDokumentuPobytowego ? ` (${foreigner.typDokumentuPobytowego})` : ""}
                          </div>
                          <div className="text-blue-700">Ważna do: {fmt(foreigner.decyzjaPobytowaDo)}</div>
                          {foreigner.employmentBases.some((b) => b.typ === "ZEZWOLENIE" && b.status !== "WYGASLE") && (
                            <div className="mt-1 text-xs text-blue-600">Zezwolenia na pracę wchłonięte przez decyzję pobytową</div>
                          )}
                        </div>
                      )}
                      {/* Karta pobytu — wygasła */}
                      {kpExpired && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-red-800">
                              Karta pobytu{foreigner.typDokumentuPobytowego ? ` (${foreigner.typDokumentuPobytowego})` : ""}
                            </span>
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">WYGASŁA</span>
                          </div>
                          <div className="text-red-700">Ważna do: {fmt(foreigner.decyzjaPobytowaDo)}</div>
                        </div>
                      )}
                      {/* UPO — w procedurze */}
                      {hasUpo && (() => {
                        const uwagi = foreigner.upoUwagi?.toLowerCase() ?? "";
                        const isCukr = uwagi.includes("cukr") || (foreigner.ochronaCzasowaUkr && !uwagi.includes("stempel"));
                        const isStempel = uwagi.includes("stempel");
                        const label = isStempel
                          ? "W procedurze — stempel w paszporcie"
                          : isCukr
                            ? "Przedłużenie pobytu CUKR"
                            : "W procedurze — przedłużenie TRC";
                        return (
                          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-amber-800">{label}</span>
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">AKTUALNA</span>
                            </div>
                            <div className="text-amber-700">Wniosek doręczony: {fmt(foreigner.upoDoreczone)}</div>
                            {foreigner.upoUwagi && <div className="mt-1 text-xs text-amber-600">{foreigner.upoUwagi}</div>}
                          </div>
                        );
                      })()}
                      {/* Wiza — aktywna */}
                      {wizaActive && (
                        <div className="rounded-lg bg-purple-50 p-3 text-sm">
                          <div className="font-semibold text-purple-800">Wiza</div>
                          <div className="text-purple-700">Ważna do: {fmt(foreigner.wizaDo)}</div>
                        </div>
                      )}
                      {/* Wiza — wygasła */}
                      {wizaExpired && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-red-800">Wiza</span>
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">WYGASŁA</span>
                          </div>
                          <div className="text-red-700">Ważna do: {fmt(foreigner.wizaDo)}</div>
                        </div>
                      )}
                      {/* Ochrona czasowa UKR / Karta CUKR */}
                      {hasOchronaUkr && (() => {
                        const hasCukrCard = foreigner.typDokumentuPobytowego?.toLowerCase().includes("cukr");
                        if (hasCukrCard && kpActive) {
                          return (
                            <div className="rounded-lg bg-sky-50 border border-sky-200 p-3 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sky-800">Karta pobytu CUKR</span>
                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">AKTUALNA</span>
                              </div>
                              <div className="text-sky-700">Ważna do: {fmt(foreigner.decyzjaPobytowaDo)}</div>
                            </div>
                          );
                        }
                        return (
                          <div className="rounded-lg bg-sky-50 border border-sky-200 p-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sky-800">Ochrona czasowa (UKR)</span>
                              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">AKTUALNA</span>
                            </div>
                            <div className="text-xs text-sky-600 mt-1">PESEL UKR / status ochrony czasowej</div>
                          </div>
                        );
                      })()}
                      {/* Obywatel UE */}
                      {isEuCitizen && (
                        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-emerald-800">Pobyt obywatela UE</span>
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">AKTUALNA</span>
                          </div>
                          <div className="text-xs text-emerald-600 mt-1">Swoboda pobytu i pracy na terytorium RP</div>
                        </div>
                      )}
                      {/* Brak podstawy */}
                      {!hasAny && <span className="text-sm text-primary/40">Brak podstawy pobytowej</span>}
                    </>
                  );
                })()}
                <div className="text-sm text-primary/60">Aktualna podstawa zatrudnienia</div>
                <div className="flex flex-wrap gap-1.5">
                  {(() => {
                    const activeBases = foreigner.employmentBases.filter(
                      (b) => b.status === "AKTYWNE" || b.status === "W_TRAKCIE"
                    );
                    // Hierarchy: KARTA_POBYTU/BLUE_CARD > ZEZWOLENIE > OSWIADCZENIE > ZGLOSZENIE_UA > DOSTEP_*
                    const TYPE_HIERARCHY: Record<string, number> = {
                      KARTA_POBYTU: 6, BLUE_CARD: 6,
                      ZEZWOLENIE: 5,
                      OSWIADCZENIE: 4,
                      ZGLOSZENIE_UA: 3,
                      DOSTEP_UE: 2, DOSTEP_STUDENT: 2, DOSTEP_POBYT_STALY: 2,
                      DOSTEP_REZYDENT_UE: 2, DOSTEP_KARTA_POLAKA: 2,
                      DOSTEP_OCHRONA_MIEDZ: 2, DOSTEP_DYPLOM_PL: 2,
                    };
                    if (activeBases.length === 0) return <span className="text-sm text-primary/40">Brak</span>;
                    // Pick best by hierarchy, then by dataDo (newest)
                    const best = activeBases.reduce((a, b) => {
                      const ha = TYPE_HIERARCHY[a.typ] ?? 0;
                      const hb = TYPE_HIERARCHY[b.typ] ?? 0;
                      if (hb !== ha) return hb > ha ? b : a;
                      return (b.dataDo?.getTime() ?? 0) > (a.dataDo?.getTime() ?? 0) ? b : a;
                    });
                    const badge = TYPE_BADGES[best.typ];
                    return (
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge?.cls ?? "bg-gray-100"}`}>
                          {badge?.label ?? best.typ}
                        </span>
                        {best.stanowisko && <span className="text-xs text-primary/60">{best.stanowisko}</span>}
                        {best.dataDo && <span className="text-xs text-primary/40">do {fmt(best.dataDo)}</span>}
                      </div>
                    );
                  })()}
                </div>
                <div className="text-sm text-primary/60">Załączniki: {foreigner.attachments.length}</div>
                <div className="text-sm text-primary/60">Kontrakty HR: {foreigner.hrContracts.length}</div>
                {foreigner.jezykPreferowany && (
                  <div className="text-sm text-primary/60">
                    Język: {{ pl: "Polski", en: "English", ru: "Русский", uk: "Українська" }[foreigner.jezykPreferowany] ?? foreigner.jezykPreferowany}
                  </div>
                )}
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
          <EmploymentBasesTab
            foreignerId={foreigner.id}
            bases={foreigner.employmentBases}
            hasActiveResidence={!!hasActiveResidence}
          />
        )}

        {activeTab === "hr" && (
          <div className="space-y-6">
            {foreigner.hrContracts.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SendHrEmailButton foreignerId={foreigner.id} />
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
                wp_2025: "WP 2025",
                trc_2024: "TRC 2024",
                trc_2025: "TRC 2025",
                trc_2026: "TRC 2026",
                hr: "HR",
                inne: "Inne",
              };
              return Array.from(groups.entries()).map(([cat, files]) => (
                <div key={cat}>
                  <h3 className="mb-3 font-display text-lg font-bold text-primary">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {files.map((f) => (
                      <div key={f.id} className="flex items-start gap-3 rounded-lg border border-primary/10 bg-white p-4 shadow-sm">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-xs font-bold uppercase text-accent">
                          {f.typPliku}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-primary">{f.nazwaWyswietlana}</p>
                          {f.opis && (
                            <p className={`mt-0.5 text-xs ${f.opis.startsWith("\u26a0") ? "font-semibold text-amber-600" : "text-primary/50"}`}>
                              {f.opis}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
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
                            <ScrapeButton attachmentId={f.id} typPliku={f.typPliku} />
                            <DeleteAttachmentButton attachmentId={f.id} nazwa={f.nazwaWyswietlana} />
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

        {activeTab === "history" && (
          <FdkChangeHistory logs={foreigner.changeLogs} />
        )}
      </Container>
    </>
  );
}
