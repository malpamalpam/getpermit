"use client";

const FIELD_LABELS: Record<string, string> = {
  // Foreigner personal data
  nazwisko: "Nazwisko",
  imie: "Imię",
  dataUrodzenia: "Data urodzenia",
  miejsceUrodzenia: "Miejsce urodzenia",
  obywatelstwo: "Obywatelstwo",
  plec: "Płeć",
  pesel: "PESEL",
  nrPaszportu: "Nr paszportu",
  paszportWaznyOd: "Paszport ważny od",
  paszportWaznyDo: "Paszport ważny do",
  adresPl: "Adres w PL",
  telefon: "Telefon",
  email: "Email",
  nrKonta: "Nr konta",
  uwagi: "Uwagi",
  jezykPreferowany: "Język preferowany",
  decyzjaPobytowaDo: "Data ważności decyzji pobytowej",
  typDokumentuPobytowego: "Typ dokumentu pobytowego",
  // Employment base events
  scrape: "Scrapowanie dokumentu",
  employment_base_auto: "Automatyczne tworzenie podstawy",
  employment_base_create: "Utworzenie podstawy zatrudnienia",
  employment_base_update: "Edycja podstawy zatrudnienia",
  employment_base_delete: "Usunięcie podstawy zatrudnienia",
  attachment_upload: "Wgranie załącznika",
  attachment_delete: "Usunięcie załącznika",
  foreigner_delete: "Usunięcie profilu",
  // Employment base field-level changes (prefixed with base_ID_)
  typ: "Typ",
  status: "Status",
  rodzajUmowy: "Rodzaj umowy",
  dataOd: "Data od",
  dataDo: "Data do",
  firma: "Firma",
  nrDecyzji: "Nr decyzji",
  stanowisko: "Stanowisko",
  nrOswiadczenia: "Nr oświadczenia",
  podjeciePracy: "Rodzaj pracy",
  podjeciePracyStatus: "Status podjęcia",
  dataStartu: "Data startu",
  wynagrodzenie: "Wynagrodzenie",
  stawka: "Stawka",
  urzad: "Urząd",
  rodzajSprawy: "Rodzaj sprawy",
  sygnatura: "Sygnatura",
};

/**
 * Resolve label for a field key.
 * Handles base_ID_fieldname format from employment base updates.
 */
function getFieldLabel(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  // Handle "base_123_fieldName" format
  const baseMatch = field.match(/^base_(\d+)_(.+)$/);
  if (baseMatch) {
    const bareField = baseMatch[2];
    const baseLabel = FIELD_LABELS[bareField] ?? bareField;
    return `Podstawa #${baseMatch[1]}: ${baseLabel}`;
  }
  return field;
}

interface ChangeLog {
  id: number;
  changedBy: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: Date;
}

function isEventField(field: string): boolean {
  return [
    "scrape", "employment_base_auto", "employment_base_create",
    "employment_base_delete", "attachment_upload", "attachment_delete",
  ].includes(field);
}

export function FdkChangeHistory({ logs }: { logs: ChangeLog[] }) {
  if (logs.length === 0) {
    return <p className="py-12 text-center text-primary/40">Brak historii zmian</p>;
  }

  // Group by date (minute) + user
  const grouped = new Map<string, ChangeLog[]>();
  for (const log of logs) {
    const key = `${log.changedAt.toISOString().slice(0, 16)}_${log.changedBy}`;
    const list = grouped.get(key) ?? [];
    list.push(log);
    grouped.set(key, list);
  }

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([key, changes]) => {
        const first = changes[0];
        return (
          <div key={key} className="rounded-xl border border-primary/10 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3 text-xs text-primary/50">
              <span className="font-medium text-primary/70">{first.changedBy}</span>
              <span>{new Date(first.changedAt).toLocaleString("pl-PL")}</span>
            </div>
            <div className="space-y-2">
              {changes.map((c) => {
                const label = getFieldLabel(c.field);
                const isEvent = isEventField(c.field);
                return (
                  <div key={c.id} className="flex items-start gap-2 text-sm">
                    <span className="min-w-[200px] font-medium text-primary/60">{label}</span>
                    {isEvent ? (
                      // Events: show newValue as a single description (no old→new diff)
                      <span className="font-medium text-primary">{c.newValue ?? "—"}</span>
                    ) : (
                      <>
                        {c.oldValue && (
                          <span className="text-red-500/70 line-through">{c.oldValue}</span>
                        )}
                        {c.oldValue && <span className="text-primary/30">&rarr;</span>}
                        <span className="font-medium text-green-700">{c.newValue ?? "—"}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
