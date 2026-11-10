"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AddResidenceBasisButton } from "./AddResidenceBasisButton";
import { ResidenceBasisActions } from "./ResidenceBasisActions";
import { ResidenceReminderButton } from "./ResidenceReminderButton";

// ============================================================================
// Types
// ============================================================================

/** Mirrors Prisma FdkResidenceBasis with only the fields we need for display */
interface ResidenceBasisRow {
  id: number;
  typ: string;
  status: string;
  dataOd: Date | null;
  dataDo: Date | null;
  nrDecyzji: string | null;
  nrWizy: string | null;
  nrKartyPobytu: string | null;
  kartaPobytuWaznaDo: Date | null;
  typKartyPobytu: string | null;
  urzad: string | null;
  ostateczna: boolean | null;
  zmienionaDecyzja: string | null;
  uwagi: string | null;
  sourceAttachmentId: number | null;
}

/** Legacy flat fields on FdkForeigner — kept for "W procedurze" and "Ochrona UKR" */
interface ForeignerLegacy {
  id: number;
  upoDoreczone: Date | null;
  upoUwagi: string | null;
  ochronaCzasowaUkr: boolean;
}

interface Props {
  foreigner: ForeignerLegacy;
  residenceBases: ResidenceBasisRow[];
}

// ============================================================================
// Labels & helpers
// ============================================================================

const TYPE_LABELS: Record<string, string> = {
  TRC_FDK: "TRC — FDK",
  TRC_INNY_PRACODAWCA: "TRC — inny pracodawca",
  TRC_HUMANITARNE: "TRC — humanitarne",
  TRC_POBYT_Z_CUDZ: "TRC — pobyt z cudzoziemcem",
  TRC_MALZONEK_PL: "TRC — małżonek PL",
  TRC_STUDIA: "TRC — studia",
  TRC_ABSOLWENT: "TRC — absolwent",
  TRC_DZIALALNOSC: "TRC — działalność",
  TRC_INNE_OKOLICZNOSCI: "TRC — inne okoliczności",
  TRC_BLUE_CARD: "Blue Card",
  BLUE_CARD: "Blue Card",
  KARTA_POBYTU: "TRC",
  WIZA: "Wiza",
  WIZA_HUMANITARNA: "Wiza humanitarna",
  RUCH_BEZWIZOWY: "Ruch bezwizowy",
  POBYT_STALY: "Pobyt stały",
  REZYDENT_UE: "Rezydent długoterminowy UE",
  STATUS_UCHODZCY: "Status uchodźcy",
  OCHRONA_UZUPELNIAJACA: "Ochrona uzupełniająca",
  ZGODA_HUMANITARNA: "Zgoda humanitarna",
  OBYWATEL_UE: "Obywatel UE/EOG",
  UMOWA_WYSTAPIENIA: "Umowa wystąpienia (UK)",
  PESEL_UKR: "PESEL UKR",
  POBYT_CUKR: "Pobyt CUKR",
  POBYT_NA_PRZEDLUZENIU: "Pobyt na przedłużeniu",
  KARTA_POLAKA: "Karta Polaka",
};

/** Types that are indefinite (no expiry date = valid forever) */
const INDEFINITE_TYPES = new Set([
  "POBYT_STALY", "REZYDENT_UE", "STATUS_UCHODZCY", "OCHRONA_UZUPELNIAJACA",
  "OBYWATEL_UE", "PESEL_UKR",
]);

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  AKTYWNE: { label: "Aktualna", cls: "bg-green-100 text-green-800" },
  WYGASLE: { label: "Wygasła", cls: "bg-red-100 text-red-800" },
  NIEAKTYWNE: { label: "Nieaktywna", cls: "bg-gray-100 text-gray-600" },
  UCHYLONE: { label: "Uchylona", cls: "bg-orange-100 text-orange-800" },
  UMORZONE: { label: "Umorzona", cls: "bg-gray-100 text-gray-600" },
  W_TRAKCIE: { label: "W trakcie", cls: "bg-amber-100 text-amber-800" },
  BRAK_DANYCH: { label: "Brak danych", cls: "bg-gray-100 text-gray-500" },
};

function fmt(d: Date | null | undefined): string {
  if (!d) return "—";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

/** Compute display status from dates — override DB status when dates are clear */
function computeDisplayStatus(rb: ResidenceBasisRow): { label: string; cls: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Respect explicitly set terminal statuses
  if (rb.status === "UCHYLONE" || rb.status === "UMORZONE") {
    return STATUS_STYLES[rb.status];
  }

  // Indefinite types without dataDo are active
  if (INDEFINITE_TYPES.has(rb.typ) && !rb.dataDo) {
    return STATUS_STYLES.AKTYWNE;
  }

  // Date-based computation
  if (rb.dataDo) {
    const dDo = new Date(rb.dataDo.getFullYear(), rb.dataDo.getMonth(), rb.dataDo.getDate());
    if (dDo >= today) {
      return STATUS_STYLES.AKTYWNE;
    }
    return STATUS_STYLES.WYGASLE;
  }

  // Fallback: use DB status
  return STATUS_STYLES[rb.status] ?? STATUS_STYLES.BRAK_DANYCH;
}

/** Sort: active first, then by dataDo descending (null = infinity) */
function sortBases(bases: ResidenceBasisRow[]): ResidenceBasisRow[] {
  return [...bases].sort((a, b) => {
    const aStatus = computeDisplayStatus(a);
    const bStatus = computeDisplayStatus(b);
    const aActive = aStatus.label === "Aktualna" ? 1 : 0;
    const bActive = bStatus.label === "Aktualna" ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    // Then by dataDo descending (null = Infinity)
    const aTime = a.dataDo ? a.dataDo.getTime() : Infinity;
    const bTime = b.dataDo ? b.dataDo.getTime() : Infinity;
    return bTime - aTime;
  });
}

// ============================================================================
// Component
// ============================================================================

export function ResidenceBasesTab({ foreigner, residenceBases }: Props) {
  const [showAll, setShowAll] = useState(false);

  const sorted = sortBases(residenceBases);

  // Split into active and historical
  const active = sorted.filter((rb) => {
    const s = computeDisplayStatus(rb);
    return s.label === "Aktualna" || s.label === "W trakcie";
  });
  const historical = sorted.filter((rb) => {
    const s = computeDisplayStatus(rb);
    return s.label !== "Aktualna" && s.label !== "W trakcie";
  });

  // Build legacy cards for UPO and Ochrona UKR (not yet in residence_bases table)
  const legacyCards: { type: string; period: string; details: string; status: { label: string; cls: string }; isLegacy: true; legacyType: "upo" | "ochrona_ukr" }[] = [];

  if (foreigner.upoDoreczone) {
    legacyCards.push({
      type: "W procedurze",
      period: `złożono ${fmt(foreigner.upoDoreczone)}`,
      details: foreigner.upoUwagi || "",
      status: { label: "Aktualna", cls: "bg-amber-100 text-amber-800" },
      isLegacy: true,
      legacyType: "upo",
    });
  }

  if (foreigner.ochronaCzasowaUkr) {
    legacyCards.push({
      type: "Ochrona czasowa UKR",
      period: "bezterminowo",
      details: "PESEL UKR",
      status: { label: "Aktualna", cls: "bg-green-100 text-green-800" },
      isLegacy: true,
      legacyType: "ochrona_ukr",
    });
  }

  const totalCount = residenceBases.length + legacyCards.length;
  const visibleBases = showAll ? sorted : active;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-primary">
          Podstawy pobytu
        </h3>
        <AddResidenceBasisButton foreignerId={foreigner.id} />
      </div>

      {totalCount === 0 && (
        <div className="rounded-xl border border-dashed border-primary/15 bg-surface p-8 text-center text-sm text-primary/40">
          Brak podstaw pobytowych. Dodaj pierwszą używając przycisku powyżej.
        </div>
      )}

      {/* Legacy cards (UPO, Ochrona UKR) — always visible at top */}
      {legacyCards.map((card) => (
        <div key={card.legacyType} className="rounded-xl border border-primary/10 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-[10px] font-semibold text-yellow-800">
                {card.type}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${card.status.cls}`}>
                {card.status.label}
              </span>
              <span className="text-xs text-primary/50">{card.period}</span>
            </div>
            <div className="flex items-center gap-1">
              {card.legacyType === "upo" && <ResidenceReminderButton foreignerId={foreigner.id} />}
              <ResidenceBasisActions
                foreignerId={foreigner.id}
                basisType={card.legacyType}
                currentDate={
                  card.legacyType === "upo" && foreigner.upoDoreczone
                    ? foreigner.upoDoreczone.toISOString().slice(0, 10)
                    : undefined
                }
                currentNote={
                  card.legacyType === "upo" ? (foreigner.upoUwagi ?? undefined) : undefined
                }
              />
            </div>
          </div>
          {card.details && (
            <p className="mt-2 text-sm text-primary/70">{card.details}</p>
          )}
        </div>
      ))}

      {/* Residence bases from fdk_residence_bases table */}
      {visibleBases.map((rb) => (
        <ResidenceBasisCard key={rb.id} rb={rb} foreignerId={foreigner.id} />
      ))}

      {/* Show all / collapse toggle */}
      {historical.length > 0 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary/15 py-2 text-xs font-medium text-primary/50 transition-colors hover:border-primary/30 hover:text-primary/70"
        >
          {showAll ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Zwiń historię ({historical.length})
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Pokaż wszystkie ({historical.length} wygasłych)
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Single residence basis card
// ============================================================================

function ResidenceBasisCard({ rb, foreignerId }: { rb: ResidenceBasisRow; foreignerId: number }) {
  const status = computeDisplayStatus(rb);
  const typeLabel = TYPE_LABELS[rb.typ] ?? rb.typ;
  const isIndefinite = INDEFINITE_TYPES.has(rb.typ) && !rb.dataDo;

  // Build period string
  let period = "";
  if (rb.dataOd && rb.dataDo) {
    period = `${fmt(rb.dataOd)} — ${fmt(rb.dataDo)}`;
  } else if (rb.dataDo) {
    period = `do ${fmt(rb.dataDo)}`;
  } else if (rb.dataOd && isIndefinite) {
    period = `od ${fmt(rb.dataOd)} — bezterminowo`;
  } else if (rb.dataOd) {
    period = `od ${fmt(rb.dataOd)}`;
  } else if (isIndefinite) {
    period = "bezterminowo";
  }

  // Document number: prefer nrKartyPobytu, then nrDecyzji, then nrWizy
  const docNo = rb.nrKartyPobytu || rb.nrDecyzji || rb.nrWizy || null;
  // If we have both karta and decyzja, show both
  const hasDecyzjaAndKarta = rb.nrKartyPobytu && rb.nrDecyzji && rb.nrKartyPobytu !== rb.nrDecyzji;

  return (
    <div className="rounded-xl border border-primary/10 bg-white p-4 shadow-sm">
      {/* Header row: type badge + status + period */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-[10px] font-semibold text-yellow-800">
            {typeLabel}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${status.cls}`}>
            {status.label}
          </span>
          {period && (
            <span className="text-xs text-primary/50">{period}</span>
          )}
        </div>
        <ResidenceBasisActions
          foreignerId={foreignerId}
          basisType="residence_v2"
          residenceBasisId={rb.id}
          currentResidenceBasis={rb}
        />
      </div>

      {/* Detail fields */}
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-primary/60">
        {docNo && (
          <span>
            <span className="font-medium text-primary/70">Nr:</span>{" "}
            {docNo}
          </span>
        )}
        {hasDecyzjaAndKarta && (
          <span>
            <span className="font-medium text-primary/70">Sygnatura:</span>{" "}
            {rb.nrDecyzji}
          </span>
        )}
        {rb.urzad && (
          <span>
            <span className="font-medium text-primary/70">Urząd:</span>{" "}
            {rb.urzad}
          </span>
        )}
        {rb.kartaPobytuWaznaDo && (
          <span>
            <span className="font-medium text-primary/70">Karta ważna do:</span>{" "}
            {fmt(rb.kartaPobytuWaznaDo)}
          </span>
        )}
        {rb.ostateczna !== null && (
          <span>
            <span className="font-medium text-primary/70">Ostateczna:</span>{" "}
            {rb.ostateczna ? "Tak" : "Nie"}
          </span>
        )}
      </div>

      {/* Uwagi */}
      {rb.uwagi && (
        <p className="mt-1.5 text-xs text-primary/50 italic">{rb.uwagi}</p>
      )}

      {/* Zmieniona decyzja */}
      {rb.zmienionaDecyzja && (
        <p className="mt-1 text-xs text-orange-600">
          Zmieniona decyzją: {rb.zmienionaDecyzja}
        </p>
      )}
    </div>
  );
}
