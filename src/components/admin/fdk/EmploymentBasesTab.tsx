"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmploymentBaseEditForm } from "./EmploymentBaseEditForm";
import { deleteEmploymentBaseAction } from "@/lib/fdk-actions";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface EmploymentBase {
  id: number;
  foreignerId: number;
  typ: string;
  status: string;
  rodzajUmowy: string | null;
  dataOd: Date | null;
  dataDo: Date | null;
  firma: string | null;
  nrDecyzji: string | null;
  wezwanieBraki: string | null;
  powiadomienieDo: Date | null;
  uchylenie: string | null;
  startInfo: string | null;
  przedluzenie: boolean;
  przewidywanaDataPodjecia: boolean;
  przewidywanaDataKomentarz: string | null;
  reminderDate: Date | null;
  reminderCalendarEventId: number | null;
  nrOswiadczenia: string | null;
  podjeciePracy: string | null;
  podjeciePracyStatus: string | null;
  podjeciePracyData: Date | null;
  dataStartu: Date | null;
  oswCalendarEventIds: string | null;
  urzad: string | null;
  rodzajSprawy: string | null;
  dataZlozenia: Date | null;
  sposobWysylki: string | null;
  sygnatura: string | null;
  brakujaceDokumenty: string | null;
  uwagiKp: string | null;
  wynagrodzenie: string | null;
  dataZgloszeniaUmowy: Date | null;
  dataPodjPracy: Date | null;
  dataNiepodjPracy: Date | null;
  dataZakPracy: Date | null;
  decyzjaOdebrana: Date | null;
  stanowisko: string | null;
  stawka: unknown;
  dataPodjecia: Date | null;
  uwagiUa: string | null;
  uwagi: string | null;
}

interface Props {
  foreignerId: number;
  bases: EmploymentBase[];
  hasActiveResidence: boolean;
  obywatelstwo?: string | null;
}

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

const STATUS_COLORS: Record<string, string> = {
  AKTYWNE: "bg-green-100 text-green-800",
  NIEAKTYWNE: "bg-gray-100 text-gray-700",
  WYGASLE: "bg-red-100 text-red-800",
  UCHYLONE: "bg-red-100 text-red-800",
  UMORZONE: "bg-red-100 text-red-800",
  W_TRAKCIE: "bg-yellow-100 text-yellow-800",
  BRAK_DANYCH: "bg-gray-100 text-gray-600",
};

function fmt(d: Date | null | undefined): string {
  if (!d) return "—";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

export function EmploymentBasesTab({ foreignerId, bases, hasActiveResidence, obywatelstwo }: Props) {
  const router = useRouter();
  const [editingBase, setEditingBase] = useState<EmploymentBase | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const handleDeleteBase = async (baseId: number) => {
    if (!confirm("Na pewno usunac te podstawe zatrudnienia? Tej operacji nie mozna cofnac.")) return;
    try {
      await deleteEmploymentBaseAction(baseId);
      router.refresh();
    } catch {
      alert("Nie udalo sie usunac podstawy.");
    }
  };

  // Only show one (most recent) active residence permit (KARTA_POBYTU or BLUE_CARD) in main view
  const residenceTypes = ["KARTA_POBYTU", "BLUE_CARD"];
  const activeResidence = bases.filter((b) => residenceTypes.includes(b.typ) && b.status === "AKTYWNE");
  const latestActiveResidence = activeResidence.length > 0 ? activeResidence[0] : null; // already sorted desc

  // Determine which bases to show as "active employment bases"
  const visibleBases = showAll
    ? bases
    : bases.filter((b) => {
        // Hide superseded WP (wchłonięte by active residence)
        if (hasActiveResidence && b.typ === "ZEZWOLENIE" && b.status !== "WYGASLE" && b.status !== "UCHYLONE" && b.status !== "UMORZONE") {
          return false;
        }
        // Hide inactive/wygasle/nieaktywne bases
        if (b.status === "NIEAKTYWNE" || b.status === "WYGASLE") {
          return false;
        }
        // Show only the most recent active residence permit, hide other active ones
        if (residenceTypes.includes(b.typ) && b.status === "AKTYWNE" && latestActiveResidence && b.id !== latestActiveResidence.id) {
          return false;
        }
        return true;
      });

  const hiddenCount = bases.length - visibleBases.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {hiddenCount > 0 && !showAll && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="text-xs text-accent hover:underline"
            >
              Pokaż wszystkie ({bases.length}) — ukrytych: {hiddenCount} (wchłonięte/nieaktywne)
            </button>
          )}
          {showAll && hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="text-xs text-accent hover:underline"
            >
              Pokaż tylko aktywne podstawy
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" /> Dodaj podstawę zatrudnienia
        </button>
      </div>

      {visibleBases.length === 0 && (
        <p className="py-12 text-center text-primary/40">Brak aktywnych podstaw zatrudnienia</p>
      )}

      {visibleBases.map((b) => {
        // Only ZEZWOLENIE is "wchłonięte" by active residence permit.
        // OŚW is never wchłonięte — it gets NIEAKTYWNE status after zakończenie pracy.
        const isSuperseded =
          hasActiveResidence &&
          b.typ === "ZEZWOLENIE" &&
          b.status !== "WYGASLE" &&
          b.status !== "UCHYLONE" &&
          b.status !== "UMORZONE";
        return (
          <div
            key={b.id}
            className={`rounded-xl border bg-white p-6 shadow-sm ${
              isSuperseded ? "border-orange-200 opacity-60" : "border-primary/10"
            }`}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TYPE_BADGES[b.typ]?.cls ?? "bg-gray-100"}`}>
                {TYPE_BADGES[b.typ]?.label ?? b.typ}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[b.status] ?? STATUS_COLORS.BRAK_DANYCH}`}>
                {b.status.replace("_", " ")}
              </span>
              {b.nrDecyzji && <span className="text-xs text-primary/50">Nr: {b.nrDecyzji}</span>}
              {b.nrOswiadczenia && <span className="text-xs text-primary/50">Nr: {b.nrOswiadczenia}</span>}
              {isSuperseded && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                  Wchłonięte przez decyzję pobytową
                </span>
              )}
              {b.status === "BRAK_DANYCH" && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 animate-pulse">
                  Uzupelnij daty
                </span>
              )}
              <button
                type="button"
                onClick={() => setEditingBase(b)}
                className="ml-auto inline-flex items-center gap-1 rounded-md bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/20"
              >
                <Pencil className="h-3 w-3" /> Edytuj
              </button>
              <button
                type="button"
                onClick={() => handleDeleteBase(b.id)}
                className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
              >
                <Trash2 className="h-3 w-3" /> Usun
              </button>
            </div>
            <dl className="grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
              {[
                ["Okres", b.dataOd || b.dataDo ? `${fmt(b.dataOd)} – ${fmt(b.dataDo)}` : null],
                ["Rodzaj umowy", b.rodzajUmowy],
                ["Wynagrodzenie", b.wynagrodzenie ?? (b.stawka ? `${Number(b.stawka).toLocaleString("pl-PL")} PLN` : null)],
                ["Firma", b.firma],
                ["Stanowisko / rodzaj pracy", b.stanowisko ?? b.podjeciePracy],
                ["Urząd", b.urzad],
                ["Rodzaj sprawy", b.rodzajSprawy],
                ["Sygnatura", b.sygnatura],
                ["Nr oświadczenia", b.nrOswiadczenia],
                ["Status podjęcia", b.podjeciePracyStatus === "PODJAL" ? "Podjął pracę" : b.podjeciePracyStatus === "NIE_PODJAL" ? "Nie podjął pracy" : null],
                ["Data podjęcia pracy", b.podjeciePracyData ? fmt(b.podjeciePracyData) : null],
                ["Data rozpoczęcia pracy", b.dataStartu ? fmt(b.dataStartu) : null],
                // Calendar-derived dates
                ["Zgłoszenie umowy (kalendarz)", b.dataStartu ? (() => { const d = new Date(b.dataStartu); d.setDate(d.getDate() - 1); return fmt(d); })() : null],
                ["Notyfikacja podjęcia pracy (kalendarz)", b.dataStartu ? (() => { const d = new Date(b.dataStartu); d.setDate(d.getDate() + 7); return fmt(d); })() : null],
                ["Niepodjęcie pracy (kalendarz)", b.podjeciePracyStatus === "NIE_PODJAL" && b.dataDo ? (() => { const d = new Date(b.dataDo); d.setDate(d.getDate() + 14); return fmt(d); })() : null],
                ["Wezwanie/braki", b.wezwanieBraki],
                ["Przedłużenie", b.przedluzenie ? "Tak" : null],
                ["Podjęcie pracy potwierdzone", b.przewidywanaDataPodjecia ? "Tak" : null],
                ["Przypomnienie (55 dni)", b.reminderDate ? fmt(b.reminderDate) : null],
                ["Uchylenie", b.uchylenie],
                ["Sposób wysyłki", b.sposobWysylki],
                ["Data złożenia", b.dataZlozenia ? fmt(b.dataZlozenia) : null],
                ["Brakujące dokumenty", b.brakujaceDokumenty],
                ["Powiadomienie do", b.powiadomienieDo ? fmt(b.powiadomienieDo) : null],
                ["Decyzja odebrana", b.decyzjaOdebrana ? fmt(b.decyzjaOdebrana) : null],
                ["Stawka", b.stawka ? `${Number(b.stawka).toLocaleString("pl-PL")} PLN` : null],
                ["Data zgłoszenia umowy", b.dataZgloszeniaUmowy ? fmt(b.dataZgloszeniaUmowy) : null],
                ["Data podjęcia pracy", b.dataPodjPracy ? fmt(b.dataPodjPracy) : null],
                ["Zgłosić niepodjęcie do", b.dataNiepodjPracy ? fmt(b.dataNiepodjPracy) : null],
                ["Data zakończenia pracy", b.dataZakPracy ? fmt(b.dataZakPracy) : null],
                ["Data podjęcia (UA)", b.dataPodjecia ? fmt(b.dataPodjecia) : null],
                ["Uwagi KP", b.uwagiKp],
                ["Uwagi UA", b.uwagiUa],
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
        );
      })}

      {/* Edit modal */}
      {editingBase && (
        <EmploymentBaseEditForm
          foreignerId={foreignerId}
          base={editingBase}
          obywatelstwo={obywatelstwo}
          onClose={() => setEditingBase(null)}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <EmploymentBaseEditForm
          foreignerId={foreignerId}
          obywatelstwo={obywatelstwo}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
