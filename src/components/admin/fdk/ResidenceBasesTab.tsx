"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

function computeStatus(foreigner: ForeignerResidence): { label: string; cls: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (foreigner.upoDoreczone) {
    return { label: "W procedurze", cls: "bg-amber-100 text-amber-800" };
  }
  if (foreigner.ochronaCzasowaUkr) {
    return { label: "Aktualna (PESEL UKR)", cls: "bg-green-100 text-green-800" };
  }
  if (foreigner.decyzjaPobytowaDo) {
    const d = new Date(foreigner.decyzjaPobytowaDo.getFullYear(), foreigner.decyzjaPobytowaDo.getMonth(), foreigner.decyzjaPobytowaDo.getDate());
    return d >= today
      ? { label: "Aktualna", cls: "bg-green-100 text-green-800" }
      : { label: "Wygasła", cls: "bg-red-100 text-red-800" };
  }
  if (foreigner.wizaDo) {
    const d = new Date(foreigner.wizaDo.getFullYear(), foreigner.wizaDo.getMonth(), foreigner.wizaDo.getDate());
    return d >= today
      ? { label: "Aktualna", cls: "bg-green-100 text-green-800" }
      : { label: "Wygasła", cls: "bg-red-100 text-red-800" };
  }
  return { label: "Brak", cls: "bg-gray-100 text-gray-500" };
}

interface Props {
  foreigner: ForeignerResidence;
}

export function ResidenceBasesTab({ foreigner }: Props) {
  const router = useRouter();
  const status = computeStatus(foreigner);

  // Budujemy listę "kart" z wypełnionych pól
  const cards: { type: string; period: string; details: string; status: { label: string; cls: string } }[] = [];

  if (foreigner.decyzjaPobytowaDo) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const d = new Date(foreigner.decyzjaPobytowaDo.getFullYear(), foreigner.decyzjaPobytowaDo.getMonth(), foreigner.decyzjaPobytowaDo.getDate());
    cards.push({
      type: foreigner.typDokumentuPobytowego || "Karta pobytu",
      period: `do ${fmt(foreigner.decyzjaPobytowaDo)}`,
      details: foreigner.typDokumentuPobytowego ? `Typ: ${foreigner.typDokumentuPobytowego}` : "",
      status: d >= today
        ? { label: "Aktualna", cls: "bg-green-100 text-green-800" }
        : { label: "Wygasła", cls: "bg-red-100 text-red-800" },
    });
  }

  if (foreigner.wizaDo) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const d = new Date(foreigner.wizaDo.getFullYear(), foreigner.wizaDo.getMonth(), foreigner.wizaDo.getDate());
    cards.push({
      type: "Wiza",
      period: `do ${fmt(foreigner.wizaDo)}`,
      details: "",
      status: d >= today
        ? { label: "Aktualna", cls: "bg-green-100 text-green-800" }
        : { label: "Wygasła", cls: "bg-red-100 text-red-800" },
    });
  }

  if (foreigner.upoDoreczone) {
    cards.push({
      type: "W procedurze",
      period: `złożono ${fmt(foreigner.upoDoreczone)}`,
      details: foreigner.upoUwagi || "",
      status: { label: "W procedurze", cls: "bg-amber-100 text-amber-800" },
    });
  }

  if (foreigner.ochronaCzasowaUkr) {
    cards.push({
      type: "Ochrona czasowa UKR",
      period: "bezterminowo",
      details: "PESEL UKR",
      status: { label: "Aktualna", cls: "bg-green-100 text-green-800" },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-primary">
          Podstawy pobytu ({cards.length})
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
          <div className="mb-2 flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-[10px] font-semibold text-yellow-800">
              {card.type}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${card.status.cls}`}>
              {card.status.label}
            </span>
            <span className="text-xs text-primary/50">{card.period}</span>
          </div>
          {card.details && (
            <p className="text-sm text-primary/70">{card.details}</p>
          )}
        </div>
      ))}

      <div className="pt-2">
        <ResidenceBasisActions foreignerId={foreigner.id} foreigner={foreigner as never} />
      </div>
    </div>
  );
}
