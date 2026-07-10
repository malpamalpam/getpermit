"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createEmploymentBaseAction,
  updateEmploymentBaseAction,
  deleteEmploymentBaseAction,
} from "@/lib/fdk-actions";
import { Pencil, Plus, Trash2, X, Loader2, Save } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BaseType = "ZEZWOLENIE" | "OSWIADCZENIE" | "KARTA_POBYTU" | "BLUE_CARD" | "ZGLOSZENIE_UA";
type StatusType = "AKTYWNE" | "WYGASLE" | "UCHYLONE" | "UMORZONE" | "W_TRAKCIE" | "BRAK_DANYCH";

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
  // ... (WP fields from sekcja 5 already declared above)
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
  base?: EmploymentBase; // null = create mode
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TYPE_OPTIONS: { value: BaseType; label: string }[] = [
  { value: "ZEZWOLENIE", label: "Zezwolenie na pracę" },
  { value: "OSWIADCZENIE", label: "Oświadczenie" },
  { value: "KARTA_POBYTU", label: "Karta pobytu" },
  { value: "BLUE_CARD", label: "Blue Card" },
  { value: "ZGLOSZENIE_UA", label: "Zgłoszenie UA" },
];

const STATUS_OPTIONS: { value: StatusType; label: string }[] = [
  { value: "AKTYWNE", label: "Aktywne" },
  { value: "WYGASLE", label: "Wygasłe" },
  { value: "UCHYLONE", label: "Uchylone" },
  { value: "UMORZONE", label: "Umorzone" },
  { value: "W_TRAKCIE", label: "W trakcie" },
  { value: "BRAK_DANYCH", label: "Brak danych" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmploymentBaseEditForm({ foreignerId, base, onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!base;

  // Form state
  const [typ, setTyp] = useState<BaseType>((base?.typ as BaseType) ?? "ZEZWOLENIE");
  const [status, setStatus] = useState<StatusType>((base?.status as StatusType) ?? "BRAK_DANYCH");
  const [rodzajUmowy, setRodzajUmowy] = useState(base?.rodzajUmowy ?? "");
  const [dataOd, setDataOd] = useState(fmtDate(base?.dataOd));
  const [dataDo, setDataDo] = useState(fmtDate(base?.dataDo));
  // Zezwolenie
  const [firma, setFirma] = useState(base?.firma ?? "");
  const [nrDecyzji, setNrDecyzji] = useState(base?.nrDecyzji ?? "");
  const [wezwanieBraki, setWezwanieBraki] = useState(base?.wezwanieBraki ?? "");
  const [powiadomienieDo, setPowiadomienieDo] = useState(fmtDate(base?.powiadomienieDo));
  const [uchylenie, setUchylenie] = useState(base?.uchylenie ?? "");
  const [startInfo, setStartInfo] = useState(base?.startInfo ?? "");
  const [przedluzenie, setPrzedluzenie] = useState(base?.przedluzenie ?? false);
  const [przewidywanaDataPodjecia, setPrzewidywanaDataPodjecia] = useState(base?.przewidywanaDataPodjecia ?? false);
  const [przewidywanaDataKomentarz, setPrzewidywanaDataKomentarz] = useState(base?.przewidywanaDataKomentarz ?? "");
  // Oświadczenie
  const [nrOswiadczenia, setNrOswiadczenia] = useState(base?.nrOswiadczenia ?? "");
  const [podjeciePracy, setPodjeciePracy] = useState(base?.podjeciePracy ?? "");
  const [podjeciePracyStatus, setPodjeciePracyStatus] = useState(base?.podjeciePracyStatus ?? "");
  const [podjeciePracyData, setPodjeciePracyData] = useState(fmtDate(base?.podjeciePracyData));
  const [dataStartu, setDataStartu] = useState(fmtDate(base?.dataStartu));
  // Karta pobytu
  const [urzad, setUrzad] = useState(base?.urzad ?? "");
  const [rodzajSprawy, setRodzajSprawy] = useState(base?.rodzajSprawy ?? "");
  const [dataZlozenia, setDataZlozenia] = useState(fmtDate(base?.dataZlozenia));
  const [sposobWysylki, setSposobWysylki] = useState(base?.sposobWysylki ?? "");
  const [sygnatura, setSygnatura] = useState(base?.sygnatura ?? "");
  const [brakujaceDokumenty, setBrakujaceDokumenty] = useState(base?.brakujaceDokumenty ?? "");
  const [uwagiKp, setUwagiKp] = useState(base?.uwagiKp ?? "");
  // Blue Card
  const [decyzjaOdebrana, setDecyzjaOdebrana] = useState(fmtDate(base?.decyzjaOdebrana));
  const [stanowisko, setStanowisko] = useState(base?.stanowisko ?? "");
  const [stawka, setStawka] = useState(base?.stawka ? String(base.stawka) : "");
  // Zgłoszenie UA
  const [dataPodjecia, setDataPodjecia] = useState(fmtDate(base?.dataPodjecia));
  const [uwagiUa, setUwagiUa] = useState(base?.uwagiUa ?? "");
  // Wynagrodzenie (wspólne)
  const [wynagrodzenie, setWynagrodzenie] = useState(base?.wynagrodzenie ?? "");
  // Daty zgłoszeniowe
  const [dataZgloszeniaUmowy, setDataZgloszeniaUmowy] = useState(fmtDate(base?.dataZgloszeniaUmowy));
  const [dataPodjPracy, setDataPodjPracy] = useState(fmtDate(base?.dataPodjPracy));
  const [dataNiepodjPracy, setDataNiepodjPracy] = useState(fmtDate(base?.dataNiepodjPracy));
  const [dataZakPracy, setDataZakPracy] = useState(fmtDate(base?.dataZakPracy));
  // Ogólne
  const [uwagi, setUwagi] = useState(base?.uwagi ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const input = {
      foreignerId,
      typ,
      status,
      rodzajUmowy,
      dataOd,
      dataDo,
      firma,
      nrDecyzji,
      wezwanieBraki,
      powiadomienieDo,
      uchylenie,
      startInfo,
      przedluzenie,
      przewidywanaDataPodjecia,
      przewidywanaDataKomentarz,
      nrOswiadczenia,
      podjeciePracy,
      podjeciePracyStatus,
      podjeciePracyData,
      dataStartu,
      urzad,
      rodzajSprawy,
      dataZlozenia,
      sposobWysylki,
      sygnatura,
      brakujaceDokumenty,
      uwagiKp,
      decyzjaOdebrana,
      stanowisko,
      stawka,
      dataPodjecia,
      uwagiUa,
      wynagrodzenie,
      dataZgloszeniaUmowy,
      dataPodjPracy,
      dataNiepodjPracy,
      dataZakPracy,
      uwagi,
    };

    startTransition(async () => {
      try {
        const result = isEdit
          ? await updateEmploymentBaseAction(base.id, input)
          : await createEmploymentBaseAction(input);
        if (result.ok) {
          onClose();
          router.refresh();
        } else {
          setError("Nie udało się zapisać. Sprawdź wymagane pola.");
        }
      } catch {
        setError("Wystąpił błąd połączenia.");
      }
    });
  };

  const handleDelete = () => {
    if (!base || !confirm("Na pewno usunąć tę podstawę zatrudnienia?")) return;
    startTransition(async () => {
      try {
        await deleteEmploymentBaseAction(base.id);
        onClose();
        router.refresh();
      } catch {
        setError("Nie udało się usunąć.");
      }
    });
  };

  const inputCls =
    "block w-full rounded-md border border-primary/15 bg-white px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20";
  const labelCls = "mb-1 block text-xs font-medium text-primary/60";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-primary">
            {isEdit ? "Edytuj podstawę zatrudnienia" : "Nowa podstawa zatrudnienia"}
          </h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-primary/40 hover:bg-primary/5">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Typ + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Typ dokumentu *</label>
              <select value={typ} onChange={(e) => setTyp(e.target.value as BaseType)} className={inputCls} disabled={isEdit}>
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>
                Status <span className="text-primary/30">(obliczany z dat)</span>
              </label>
              <select value={status} onChange={(e) => setStatus(e.target.value as StatusType)} className={inputCls}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Wspólne: daty + rodzaj umowy */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Data od</label>
              <input type="date" value={dataOd} onChange={(e) => setDataOd(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Data do</label>
              <input type="date" value={dataDo} onChange={(e) => setDataDo(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Rodzaj umowy</label>
              <input value={rodzajUmowy} onChange={(e) => setRodzajUmowy(e.target.value)} className={inputCls} placeholder="np. umowa o pracę" />
            </div>
          </div>

          {/* Wynagrodzenie */}
          <div>
            <label className={labelCls}>Wysokość wynagrodzenia</label>
            <input value={wynagrodzenie} onChange={(e) => setWynagrodzenie(e.target.value)} className={inputCls} placeholder="np. 5 000 PLN brutto" />
          </div>

          {/* Daty zgłoszeniowe */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <label className={labelCls}>Data zgłoszenia umowy</label>
              <input type="date" value={dataZgloszeniaUmowy} onChange={(e) => setDataZgloszeniaUmowy(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Data podjęcia pracy</label>
              <input type="date" value={dataPodjPracy} onChange={(e) => setDataPodjPracy(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Zgłosić niepodjęcie do</label>
              <input type="date" value={dataNiepodjPracy} onChange={(e) => setDataNiepodjPracy(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Data zakończenia pracy</label>
              <input type="date" value={dataZakPracy} onChange={(e) => setDataZakPracy(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* === Zezwolenie === */}
          {typ === "ZEZWOLENIE" && (
            <fieldset className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/30 p-4">
              <legend className="px-2 text-xs font-bold text-blue-700">Zezwolenie na pracę</legend>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Firma</label>
                  <input value={firma} onChange={(e) => setFirma(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Nr decyzji</label>
                  <input value={nrDecyzji} onChange={(e) => setNrDecyzji(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Powiadomienie do</label>
                  <input type="date" value={powiadomienieDo} onChange={(e) => setPowiadomienieDo(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Stanowisko</label>
                  <input value={stanowisko} onChange={(e) => setStanowisko(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Wezwanie / braki</label>
                <textarea value={wezwanieBraki} onChange={(e) => setWezwanieBraki(e.target.value)} className={inputCls} rows={2} />
              </div>
              <div>
                <label className={labelCls}>Uchylenie</label>
                <textarea value={uchylenie} onChange={(e) => setUchylenie(e.target.value)} className={inputCls} rows={2} />
              </div>
              <div>
                <label className={labelCls}>Informacja o starcie</label>
                <textarea value={startInfo} onChange={(e) => setStartInfo(e.target.value)} className={inputCls} rows={2} />
              </div>

              {/* Data rozpoczęcia pracy */}
              <div>
                <label className={labelCls}>Data rozpoczęcia pracy</label>
                <input type="date" value={dataStartu} onChange={(e) => setDataStartu(e.target.value)} className={inputCls} />
                {dataStartu && (
                  <div className="mt-1.5 rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-700">
                    Zostaną utworzone 2 powiadomienia:
                    <ul className="ml-4 mt-1 list-disc">
                      <li><strong>1 dzień przed</strong> ({(() => { const d = new Date(dataStartu); d.setDate(d.getDate() - 1); return d.toLocaleDateString("pl-PL"); })()}) — Zgłoszenie umowy</li>
                      <li><strong>7. dzień od</strong> ({(() => { const d = new Date(dataStartu); d.setDate(d.getDate() + 7); return d.toLocaleDateString("pl-PL"); })()}) — Notyfikacja podjęcia pracy</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Nowe ticki */}
              <div className="space-y-3 rounded-md border border-blue-300/50 bg-blue-50/50 p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={przedluzenie}
                    onChange={(e) => setPrzedluzenie(e.target.checked)}
                    className="h-4 w-4 rounded border-primary/30 text-accent focus:ring-accent/30"
                  />
                  <span className="text-sm font-medium text-primary">Przedłużenie poprzedniego zezwolenia</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={przewidywanaDataPodjecia}
                    onChange={(e) => setPrzewidywanaDataPodjecia(e.target.checked)}
                    className="h-4 w-4 rounded border-primary/30 text-accent focus:ring-accent/30"
                  />
                  <span className="text-sm font-medium text-primary">Przewidywana data podjęcia pracy</span>
                </label>

                {!przewidywanaDataPodjecia && dataDo && (
                  <div className="ml-6 rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-700">
                    Przypomnienie zostanie utworzone na <strong>55. dzień</strong> od daty ważności zezwolenia ({(() => {
                      const d = new Date(dataDo);
                      d.setDate(d.getDate() + 55);
                      return d.toLocaleDateString("pl-PL");
                    })()}).
                  </div>
                )}

                <div>
                  <label className={labelCls}>Komentarz do przypomnienia</label>
                  <input value={przewidywanaDataKomentarz} onChange={(e) => setPrzewidywanaDataKomentarz(e.target.value)} className={inputCls} placeholder="opcjonalny komentarz" />
                </div>
              </div>
            </fieldset>
          )}

          {/* === Oświadczenie === */}
          {typ === "OSWIADCZENIE" && (
            <fieldset className="space-y-3 rounded-lg border border-green-200 bg-green-50/30 p-4">
              <legend className="px-2 text-xs font-bold text-green-700">Oświadczenie</legend>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nr oświadczenia</label>
                  <input value={nrOswiadczenia} onChange={(e) => setNrOswiadczenia(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Rodzaj pracy (pkt 3.1)</label>
                  <input value={podjeciePracy} onChange={(e) => setPodjeciePracy(e.target.value)} className={inputCls} placeholder="np. rodzaj pracy" />
                </div>
              </div>

              {/* Ticki podjęcie / niepodjęcie */}
              <div className="space-y-2 rounded-md border border-green-300/50 bg-green-50/50 p-3">
                <div className="text-xs font-semibold text-green-700 mb-1">Status podjęcia pracy</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="podjeciePracyStatus"
                    value=""
                    checked={podjeciePracyStatus === ""}
                    onChange={() => setPodjeciePracyStatus("")}
                    className="h-4 w-4 text-accent focus:ring-accent/30"
                  />
                  <span className="text-sm text-primary">Brak informacji</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="podjeciePracyStatus"
                    value="PODJAL"
                    checked={podjeciePracyStatus === "PODJAL"}
                    onChange={() => setPodjeciePracyStatus("PODJAL")}
                    className="h-4 w-4 text-accent focus:ring-accent/30"
                  />
                  <span className="text-sm text-primary">Podjęcie pracy</span>
                </label>
                {podjeciePracyStatus === "PODJAL" && (
                  <div className="ml-6">
                    <label className={labelCls}>Data podjęcia pracy</label>
                    <input type="date" value={podjeciePracyData} onChange={(e) => setPodjeciePracyData(e.target.value)} className={inputCls} />
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="podjeciePracyStatus"
                    value="NIE_PODJAL"
                    checked={podjeciePracyStatus === "NIE_PODJAL"}
                    onChange={() => setPodjeciePracyStatus("NIE_PODJAL")}
                    className="h-4 w-4 text-accent focus:ring-accent/30"
                  />
                  <span className="text-sm text-primary">Niepodjęcie pracy (14 dni od daty ważności)</span>
                </label>
              </div>

              {/* Data startu → powiadomienia */}
              <div>
                <label className={labelCls}>Data startu pracy</label>
                <input type="date" value={dataStartu} onChange={(e) => setDataStartu(e.target.value)} className={inputCls} />
                {dataStartu && (
                  <div className="mt-1.5 rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-700">
                    Zostaną utworzone 2 powiadomienia:
                    <ul className="ml-4 mt-1 list-disc">
                      <li><strong>1 dzień przed</strong> ({(() => { const d = new Date(dataStartu); d.setDate(d.getDate() - 1); return d.toLocaleDateString("pl-PL"); })()}) — Zgłoszenie umowy</li>
                      <li><strong>7. dzień od</strong> ({(() => { const d = new Date(dataStartu); d.setDate(d.getDate() + 7); return d.toLocaleDateString("pl-PL"); })()}) — Notyfikacja podjęcia pracy</li>
                    </ul>
                  </div>
                )}
              </div>
            </fieldset>
          )}

          {/* === Karta pobytu === */}
          {typ === "KARTA_POBYTU" && (
            <fieldset className="space-y-3 rounded-lg border border-yellow-200 bg-yellow-50/30 p-4">
              <legend className="px-2 text-xs font-bold text-yellow-700">Karta pobytu</legend>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Urząd</label>
                  <input value={urzad} onChange={(e) => setUrzad(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Rodzaj sprawy</label>
                  <input value={rodzajSprawy} onChange={(e) => setRodzajSprawy(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Data złożenia</label>
                  <input type="date" value={dataZlozenia} onChange={(e) => setDataZlozenia(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Sposób wysyłki</label>
                  <input value={sposobWysylki} onChange={(e) => setSposobWysylki(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Sygnatura</label>
                <input value={sygnatura} onChange={(e) => setSygnatura(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Brakujące dokumenty</label>
                <textarea value={brakujaceDokumenty} onChange={(e) => setBrakujaceDokumenty(e.target.value)} className={inputCls} rows={2} />
              </div>
              <div>
                <label className={labelCls}>Uwagi (karta pobytu)</label>
                <textarea value={uwagiKp} onChange={(e) => setUwagiKp(e.target.value)} className={inputCls} rows={2} />
              </div>
            </fieldset>
          )}

          {/* === Blue Card === */}
          {typ === "BLUE_CARD" && (
            <fieldset className="space-y-3 rounded-lg border border-purple-200 bg-purple-50/30 p-4">
              <legend className="px-2 text-xs font-bold text-purple-700">Blue Card</legend>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Decyzja odebrana</label>
                  <input type="date" value={decyzjaOdebrana} onChange={(e) => setDecyzjaOdebrana(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Stanowisko</label>
                  <input value={stanowisko} onChange={(e) => setStanowisko(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Stawka (PLN)</label>
                  <input type="number" step="0.01" value={stawka} onChange={(e) => setStawka(e.target.value)} className={inputCls} />
                </div>
              </div>
            </fieldset>
          )}

          {/* === Zgłoszenie UA === */}
          {typ === "ZGLOSZENIE_UA" && (
            <fieldset className="space-y-3 rounded-lg border border-pink-200 bg-pink-50/30 p-4">
              <legend className="px-2 text-xs font-bold text-pink-700">Zgłoszenie UA</legend>
              <div>
                <label className={labelCls}>Data podjęcia pracy</label>
                <input type="date" value={dataPodjecia} onChange={(e) => setDataPodjecia(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Uwagi (UA)</label>
                <textarea value={uwagiUa} onChange={(e) => setUwagiUa(e.target.value)} className={inputCls} rows={2} />
              </div>
            </fieldset>
          )}

          {/* Uwagi ogólne */}
          <div>
            <label className={labelCls}>Uwagi ogólne</label>
            <textarea value={uwagi} onChange={(e) => setUwagi(e.target.value)} className={inputCls} rows={2} />
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="mt-6 flex items-center justify-between">
          {isEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Usuń
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-primary/15 px-4 py-2 text-sm font-medium text-primary/60 hover:bg-primary/5">
              Anuluj
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isPending ? "Zapisywanie..." : isEdit ? "Zapisz" : "Utwórz"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
