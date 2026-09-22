import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ArrowLeft, Eye, Download, FileText, Shield } from "lucide-react";
import { FdkUploadForm } from "@/components/admin/fdk/FdkUploadForm";
import { ScrapeButton } from "@/components/admin/fdk/ScrapeButton";
import { AddResidenceBasisButton } from "@/components/admin/fdk/AddResidenceBasisButton";
import { ResidenceBasisActions } from "@/components/admin/fdk/ResidenceBasisActions";
import { DeleteAttachmentButton } from "@/components/admin/fdk/DeleteAttachmentButton";
import { SendHrEmailButton } from "@/components/admin/fdk/SendHrEmailButton";
import { FdkEditForeignerForm } from "@/components/admin/fdk/FdkEditForeignerForm";
import { FdkChangeHistory } from "@/components/admin/fdk/FdkChangeHistory";
import { EmploymentBasesTab } from "@/components/admin/fdk/EmploymentBasesTab";
import { ResidenceBasesTab } from "@/components/admin/fdk/ResidenceBasesTab";
import { DeleteForeignerButton } from "@/components/admin/fdk/DeleteForeignerButton";
import { ResidenceReminderButton } from "@/components/admin/fdk/ResidenceReminderButton";
import { withComputedStatuses, computeResidenceStatus, getCurrentEmploymentBasis } from "@/lib/fdk-queries";

export const metadata = { robots: { index: false, follow: false } };

const TABS = [
  { key: "overview", label: "Przegląd" },
  { key: "bases", label: "Podstawy zatrudnienia" },
  { key: "residence", label: "Podstawy pobytu" },
  { key: "hr", label: "Dane HR" },
  { key: "attachments", label: "Załączniki" },
  { key: "history", label: "Historia zmian" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TYPE_BADGES: Record<string, { label: string; cls: string }> = {
  ZEZWOLENIE: { label: "Zezwolenie", cls: "bg-blue-100 text-blue-800" },
  ZEZWOLENIE_A: { label: "Zezwolenie A", cls: "bg-blue-100 text-blue-800" },
  ZEZWOLENIE_A_KONT: { label: "Zezw. A kont.", cls: "bg-blue-100 text-blue-800" },
  OSWIADCZENIE: { label: "Oświadczenie", cls: "bg-green-100 text-green-800" },
  ZGLOSZENIE_UA: { label: "Powiadomienie UA", cls: "bg-pink-100 text-pink-800" },
  POWIADOMIENIE_UA: { label: "Powiadomienie UA", cls: "bg-pink-100 text-pink-800" },
  KARTA_POBYTU: { label: "TRC", cls: "bg-yellow-100 text-yellow-800" },
  TRC_FDK: { label: "TRC — FDK", cls: "bg-yellow-100 text-yellow-800" },
  TRC_HUMANITARNE: { label: "TRC humanitarne", cls: "bg-yellow-100 text-yellow-800" },
  TRC_POBYT_Z_CUDZ: { label: "TRC pobyt z cudz.", cls: "bg-yellow-100 text-yellow-800" },
  TRC_MALZONEK_PL: { label: "TRC małżonek PL", cls: "bg-yellow-100 text-yellow-800" },
  TRC_STUDIA: { label: "TRC studia", cls: "bg-yellow-100 text-yellow-800" },
  TRC_ABSOLWENT: { label: "TRC absolwent", cls: "bg-yellow-100 text-yellow-800" },
  TRC_DZIALALNOSC: { label: "TRC działalność", cls: "bg-yellow-100 text-yellow-800" },
  BLUE_CARD: { label: "Blue Card", cls: "bg-purple-100 text-purple-800" },
  TRC_BLUE_CARD: { label: "Blue Card", cls: "bg-purple-100 text-purple-800" },
  ODWOLANIE: { label: "Odwołanie", cls: "bg-orange-100 text-orange-800" },
  DOSTEP_UE: { label: "OD UE", cls: "bg-emerald-100 text-emerald-800" },
  OD_UE: { label: "OD UE", cls: "bg-emerald-100 text-emerald-800" },
  DOSTEP_STUDENT: { label: "OD student", cls: "bg-emerald-100 text-emerald-800" },
  OD_STUDENT: { label: "OD student", cls: "bg-emerald-100 text-emerald-800" },
  DOSTEP_POBYT_STALY: { label: "OD pobyt stały", cls: "bg-emerald-100 text-emerald-800" },
  OD_POBYT_STALY: { label: "OD pobyt stały", cls: "bg-emerald-100 text-emerald-800" },
  DOSTEP_REZYDENT_UE: { label: "OD rezydent UE", cls: "bg-emerald-100 text-emerald-800" },
  OD_REZYDENT_UE: { label: "OD rezydent UE", cls: "bg-emerald-100 text-emerald-800" },
  DOSTEP_KARTA_POLAKA: { label: "OD Karta Polaka", cls: "bg-emerald-100 text-emerald-800" },
  OD_KARTA_POLAKA: { label: "OD Karta Polaka", cls: "bg-emerald-100 text-emerald-800" },
  DOSTEP_OCHRONA_MIEDZ: { label: "OD ochrona", cls: "bg-emerald-100 text-emerald-800" },
  OD_OCHRONA_UZUP: { label: "OD ochrona uzup.", cls: "bg-emerald-100 text-emerald-800" },
  OD_UCHODZCA: { label: "OD uchodźca", cls: "bg-emerald-100 text-emerald-800" },
  OD_WIZA_HUMAN: { label: "OD wiza human.", cls: "bg-emerald-100 text-emerald-800" },
  DOSTEP_DYPLOM_PL: { label: "OD absolwent", cls: "bg-emerald-100 text-emerald-800" },
  OD_ABSOLWENT: { label: "OD absolwent", cls: "bg-emerald-100 text-emerald-800" },
  OD_UK_WYSTAPIENIE: { label: "OD UK", cls: "bg-emerald-100 text-emerald-800" },
};


/** Map TRC base type to human-readable label for residence display */
const TRC_LABELS: Record<string, string> = {
  TRC_FDK: "TRC — FDK",
  TRC_HUMANITARNE: "TRC — humanitarne",
  TRC_POBYT_Z_CUDZ: "TRC — pobyt z cudzoziemcem",
  TRC_MALZONEK_PL: "TRC — małżonek PL",
  TRC_STUDIA: "TRC — studia",
  TRC_ABSOLWENT: "TRC — absolwent",
  TRC_DZIALALNOSC: "TRC — działalność",
  TRC_BLUE_CARD: "Blue Card",
  BLUE_CARD: "Blue Card",
  KARTA_POBYTU: "TRC",
};

/**
 * Derive the best TRC type label from employment bases.
 * Falls back to typDokumentuPobytowego from foreigner profile, then "Karta pobytu".
 */
function getTrcLabel(
  employmentBases: { typ: string; status: string; dataDo: Date | null }[],
  typDokumentuPobytowego: string | null | undefined
): string {
  // Find the most recent active TRC base
  const trcTypes = Object.keys(TRC_LABELS);
  const trcBases = employmentBases
    .filter((b) => trcTypes.includes(b.typ) && b.typ !== "KARTA_POBYTU")
    .sort((a, b) => (b.dataDo?.getTime() ?? 0) - (a.dataDo?.getTime() ?? 0));
  if (trcBases.length > 0) return TRC_LABELS[trcBases[0].typ] ?? "TRC";
  // Fallback to legacy KARTA_POBYTU bases
  const kpBases = employmentBases.filter((b) => b.typ === "KARTA_POBYTU");
  if (kpBases.length > 0 && typDokumentuPobytowego) return typDokumentuPobytowego;
  return typDokumentuPobytowego || "Karta pobytu";
}

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

  // Fetch all scrape logs for this foreigner (not limited by changeLogs take:200)
  const scrapeLogs = await db.fdkChangeLog.findMany({
    where: { foreignerId: id, field: "scrape" },
    select: { newValue: true },
  });

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

              // Helper: render the active document badge
              const renderActiveDoc = () => {
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
                const isWiza = foreigner.wizaDo && foreigner.wizaDo >= now && !(foreigner.decyzjaPobytowaDo && foreigner.decyzjaPobytowaDo >= now);
                const docLabel = isWiza
                  ? "Wiza ważna"
                  : `${getTrcLabel(foreigner.employmentBases, foreigner.typDokumentuPobytowego)} ważna`;
                return (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                    <Shield className="h-3 w-3" /> {docLabel}{activeDate && <> do {fmt(activeDate)}</>}
                  </span>
                );
              };

              if (rs === "aktualna_z_procedura") {
                return (
                  <>
                    {renderActiveDoc()}
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      wniosek w procedurze{foreigner.upoDoreczone && <> od {fmt(foreigner.upoDoreczone)}</>}
                    </span>
                  </>
                );
              }
              if (rs === "w_procedurze") {
                const uwLabel = foreigner.upoUwagi?.toLowerCase() ?? "";
                const procLabel = uwLabel.includes("stempel") ? "W procedurze — stempel"
                  : uwLabel.includes("cukr") ? "W procedurze — CUKR"
                  : "W procedurze — przedłużenie TRC";
                return (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    <Shield className="h-3 w-3" /> {procLabel}
                    {foreigner.upoDoreczone && <>, złożono {fmt(foreigner.upoDoreczone)}</>}
                  </span>
                );
              }
              if (rs === "aktualna") {
                return renderActiveDoc();
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
            {(() => {
              const activeBasis = getCurrentEmploymentBasis(foreigner.employmentBases);
              if (activeBasis) return null; // has active employment — no "zakończył pracę"
              // Find most recent NIEAKTYWNE base with dataZakPracy
              const ended = foreigner.employmentBases
                .filter((b) => b.status === "NIEAKTYWNE" && b.dataZakPracy)
                .sort((a, b) => (b.dataZakPracy!.getTime() - a.dataZakPracy!.getTime()));
              if (ended.length > 0) {
                return (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                    Zakończył pracę {fmt(ended[0].dataZakPracy)}
                  </span>
                );
              }
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
              {tab.key === "residence" && (
                <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold">
                  {[foreigner.decyzjaPobytowaDo, foreigner.wizaDo, foreigner.upoDoreczone, foreigner.ochronaCzasowaUkr].filter(Boolean).length}
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
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-blue-800">
                                {getTrcLabel(foreigner.employmentBases, foreigner.typDokumentuPobytowego)}
                              </div>
                              <div className="text-blue-700">Ważna do: {fmt(foreigner.decyzjaPobytowaDo)}</div>
                            </div>
                            <ResidenceBasisActions foreignerId={foreigner.id} basisType="karta" currentDate={foreigner.decyzjaPobytowaDo?.toISOString().slice(0, 10)} />
                          </div>
                          {foreigner.employmentBases.some((b) => b.typ === "ZEZWOLENIE" && b.status !== "WYGASLE") && (
                            <div className="mt-1 text-xs text-blue-600">Zezwolenia na pracę wchłonięte przez decyzję pobytową</div>
                          )}
                        </div>
                      )}
                      {/* Karta pobytu — wygasła */}
                      {kpExpired && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-red-800">
                                  {getTrcLabel(foreigner.employmentBases, foreigner.typDokumentuPobytowego)}
                                </span>
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">WYGASŁA</span>
                              </div>
                              <div className="text-red-700">Ważna do: {fmt(foreigner.decyzjaPobytowaDo)}</div>
                            </div>
                            <ResidenceBasisActions foreignerId={foreigner.id} basisType="karta" currentDate={foreigner.decyzjaPobytowaDo?.toISOString().slice(0, 10)} />
                          </div>
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
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-amber-800">{label}</span>
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">AKTUALNA</span>
                                </div>
                                <div className="text-amber-700">Wniosek doręczony: {fmt(foreigner.upoDoreczone)}</div>
                                {foreigner.upoUwagi && <div className="mt-1 text-xs text-amber-600">{foreigner.upoUwagi}</div>}
                              </div>
                              <div className="flex items-center gap-1">
                                <ResidenceReminderButton foreignerId={foreigner.id} />
                                <ResidenceBasisActions foreignerId={foreigner.id} basisType="upo" currentDate={foreigner.upoDoreczone?.toISOString().slice(0, 10)} currentNote={foreigner.upoUwagi ?? undefined} />
                              </div>
                            </div>
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
                      <AddResidenceBasisButton foreignerId={foreigner.id} />
                    </>
                  );
                })()}
                <div className="text-sm text-primary/60">Aktualna podstawa zatrudnienia</div>
                <div className="flex flex-wrap gap-1.5">
                  {(() => {
                    const best = getCurrentEmploymentBasis(foreigner.employmentBases);
                    if (best) {
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
                    }
                    // No active basis — check for "Zakończył pracę"
                    const ended = foreigner.employmentBases
                      .filter((b) => b.status === "NIEAKTYWNE" && b.dataZakPracy)
                      .sort((a, b) => (b.dataZakPracy!.getTime() - a.dataZakPracy!.getTime()));
                    if (ended.length > 0) {
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700">
                          Zakończył pracę {fmt(ended[0].dataZakPracy)}
                        </span>
                      );
                    }
                    return <span className="text-sm text-primary/40">Brak</span>;
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
            obywatelstwo={foreigner.obywatelstwo}
          />
        )}

        {activeTab === "residence" && (
          <ResidenceBasesTab foreigner={foreigner} />
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
              // Build map: attachment filename → scraped document info (type + nr)
              // Use employment bases directly — match by sourceAttachmentId or by changelog
              const attachmentDocInfo = new Map<string, { typ: string; nr: string }>();
              // First: direct match via changelogs (unlimited scrape logs)
              for (const log of foreigner.changeLogs) {
                if (log.field !== "scrape") continue;
                const val = log.newValue ?? "";
                const m = val.match(/podstaw[eę]\s+#(\d+)\s+\(([^)]+)\)\s+z\s+pliku:\s+(.+)$/);
                if (!m) continue;
                const [, baseIdStr, baseTyp, fileName] = m;
                const baseId = parseInt(baseIdStr, 10);
                const base = foreigner.employmentBases.find((b) => b.id === baseId);
                const nr = base?.nrDecyzji || base?.nrOswiadczenia || base?.sygnatura || "";
                if (nr) attachmentDocInfo.set(fileName.trim(), { typ: baseTyp, nr });
              }
              // Also check additional scrape logs fetched separately (beyond changeLogs take limit)
              for (const log of scrapeLogs) {
                const val = log.newValue ?? "";
                const m = val.match(/podstaw[eę]\s+#(\d+)\s+\(([^)]+)\)\s+z\s+pliku:\s+(.+)$/);
                if (!m) continue;
                const fn = m[3].trim();
                if (attachmentDocInfo.has(fn)) continue;
                const baseId = parseInt(m[1], 10);
                const base = foreigner.employmentBases.find((b) => b.id === baseId);
                const nr = base?.nrDecyzji || base?.nrOswiadczenia || base?.sygnatura || "";
                if (nr) attachmentDocInfo.set(fn, { typ: m[2], nr });
              }

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
                          {(() => {
                            const docInfo = attachmentDocInfo.get(f.nazwaPliku);
                            if (docInfo) {
                              const badge = TYPE_BADGES[docInfo.typ];
                              return (
                                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-primary/60">
                                  {badge && <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${badge.cls}`}>{badge.label}</span>}
                                  <span className="font-mono">{docInfo.nr}</span>
                                </p>
                              );
                            }
                            return null;
                          })()}
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
