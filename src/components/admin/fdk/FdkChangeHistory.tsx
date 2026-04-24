"use client";

const FIELD_LABELS: Record<string, string> = {
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
};

interface ChangeLog {
  id: number;
  changedBy: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: Date;
}

export function FdkChangeHistory({ logs }: { logs: ChangeLog[] }) {
  if (logs.length === 0) {
    return <p className="py-12 text-center text-primary/40">Brak historii zmian</p>;
  }

  // Group by date+user
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
              {changes.map((c) => (
                <div key={c.id} className="flex items-start gap-2 text-sm">
                  <span className="min-w-[160px] font-medium text-primary/60">
                    {FIELD_LABELS[c.field] ?? c.field}
                  </span>
                  <span className="text-red-500/70 line-through">{c.oldValue ?? "—"}</span>
                  <span className="text-primary/30">&rarr;</span>
                  <span className="font-medium text-green-700">{c.newValue ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
