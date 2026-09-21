"use client";

import { AddResidenceBasisButton } from "./AddResidenceBasisButton";
import { ResidenceBasisActions } from "./ResidenceBasisActions";

interface ForeignerResidence {
  id: number;
  decyzjaPobytowaDo: Date | null;
  typDokumentuPobytowego: string | null;
  wizaDo: Date | null;
  upoDoreczone: Date | null;
  upoUwagi: string | null;
  ochronaCzasowaUkr: boolean;
}

function fmt(d: Date | null | undefined): string {
  if (!d) return "—";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

interface ResidenceCard {
  basisType: "karta" | "wiza" | "upo" | "ochrona_ukr";
  type: string;
  period: string;
  details: string;
  status: { label: string; cls: string };
  date?: string; // ISO for edit
  note?: string;
}

function buildCards(f: ForeignerResidence): ResidenceCard[] {
  const cards: ResidenceCard[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (f.decyzjaPobytowaDo) {
    const d = new Date(f.decyzjaPobytowaDo.getFullYear(), f.decyzjaPobytowaDo.getMonth(), f.decyzjaPobytowaDo.getDate());
    const isActive = d >= today;
    cards.push({
      basisType: "karta",
      type: f.typDokumentuPobytowego || "Karta pobytu",
      period: `do ${fmt(f.decyzjaPobytowaDo)}`,
      details: f.typDokumentuPobytowego && f.typDokumentuPobytowego !== "Karta pobytu" ? "" : "",
      status: isActive
        ? { label: "Aktualna", cls: "bg-green-100 text-green-800" }
        : { label: "Wygasła", cls: "bg-red-100 text-red-800" },
      date: f.decyzjaPobytowaDo.toISOString().slice(0, 10),
      note: f.typDokumentuPobytowego ?? undefined,
    });
  }

  if (f.wizaDo) {
    const d = new Date(f.wizaDo.getFullYear(), f.wizaDo.getMonth(), f.wizaDo.getDate());
    const isActive = d >= today;
    cards.push({
      basisType: "wiza",
      type: "Wiza",
      period: `do ${fmt(f.wizaDo)}`,
      details: "",
      status: isActive
        ? { label: "Aktualna", cls: "bg-green-100 text-green-800" }
        : { label: "Wygasła", cls: "bg-red-100 text-red-800" },
      date: f.wizaDo.toISOString().slice(0, 10),
    });
  }

  if (f.upoDoreczone) {
    cards.push({
      basisType: "upo",
      type: "W procedurze",
      period: `złożono ${fmt(f.upoDoreczone)}`,
      details: f.upoUwagi || "",
      status: { label: "W procedurze", cls: "bg-amber-100 text-amber-800" },
      date: f.upoDoreczone.toISOString().slice(0, 10),
      note: f.upoUwagi ?? undefined,
    });
  }

  if (f.ochronaCzasowaUkr) {
    cards.push({
      basisType: "ochrona_ukr",
      type: "Ochrona czasowa UKR",
      period: "bezterminowo",
      details: "PESEL UKR",
      status: { label: "Aktualna", cls: "bg-green-100 text-green-800" },
    });
  }

  return cards;
}

interface Props {
  foreigner: ForeignerResidence;
}

export function ResidenceBasesTab({ foreigner }: Props) {
  const cards = buildCards(foreigner);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-primary">
          Podstawy pobytu
        </h3>
        <AddResidenceBasisButton foreignerId={foreigner.id} />
      </div>

      {cards.length === 0 && (
        <div className="rounded-xl border border-dashed border-primary/15 bg-surface p-8 text-center text-sm text-primary/40">
          Brak podstaw pobytowych. Dodaj pierwszą używając przycisku powyżej.
        </div>
      )}

      {cards.map((card, idx) => (
        <div key={idx} className="rounded-xl border border-primary/10 bg-white p-4 shadow-sm">
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
            <ResidenceBasisActions
              foreignerId={foreigner.id}
              basisType={card.basisType}
              currentDate={card.date}
              currentNote={card.note}
            />
          </div>
          {card.details && (
            <p className="mt-2 text-sm text-primary/70">{card.details}</p>
          )}
        </div>
      ))}
    </div>
  );
}
