/**
 * Skrypt zbiorczy: czyszczenie stanowisko, firma, wynagrodzenie.
 *
 * Pkt 1: Stanowisko — usuwanie prefiksów etykiet, śmieciowych wartości
 * Pkt 2: Firma — wycinanie sentencji decyzji, dedupe po nr dokumentu
 * Pkt 6: Wynagrodzenie — uzupełnianie jednostki dla niskich kwot
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-stanowisko-firma-wynagrodzenie.mjs
 *   node --env-file=.env.local scripts/fix-stanowisko-firma-wynagrodzenie.mjs --run --report raport-fix-sfw.csv
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient();
const CHANGED_BY = "fix-sfw-script";

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");
const reportIdx = args.indexOf("--report");
const REPORT_FILE = reportIdx >= 0 ? args[reportIdx + 1] : null;

const csvRows = [["baseId", "foreignerId", "nazwisko", "field", "oldValue", "newValue", "action"]];

// === Stanowisko cleanup ===
function cleanStanowisko(val) {
  if (!val) return null;
  let s = val;

  // Usuń prefiksy z etykietami
  s = s.replace(/^\/?\s*(?:rodzaj pracy|w rodzaju pracy|stanowisko)\s*[:/]\s*/i, "").trim();
  s = s.replace(/^SYMBOL PKD.*$/i, "").trim();
  s = s.replace(/^WYMIAR CZASU.*$/i, "").trim();

  // Jeśli zawiera dwukropek od etykiety — weź po dwukropku
  if (s.includes(":")) {
    const colonIdx = s.indexOf(":");
    const before = s.substring(0, colonIdx).trim();
    if (/^(Stanowisko|Rodzaj|SYMBOL|Symbol|PKD|Wymiar|rodzaj pracy|w rodzaju pracy)/i.test(before)) {
      const after = s.substring(colonIdx + 1).trim();
      if (after.length > 2) s = after;
    }
  }

  // Usuń trailing numery formularza (np. " 4" na końcu)
  s = s.replace(/\s+\d{1,2}\s*$/, "").trim();

  // Śmieci — za krótkie lub bezsensowne
  if (s.length < 3) return null;
  if (/^(pracy bez|bez|pracy|nie dotyczy|—|-)$/i.test(s)) return null;

  return s;
}

// === Firma cleanup ===
function cleanFirma(val) {
  if (!val) return null;
  let f = val;

  // Jeśli >120 znaków lub zawiera frazy z sentencji → wyciągnij nazwę firmy
  if (f.length > 120 || /udzielam zezwolenia|ob\.|ur\.\s*\d/i.test(f)) {
    // Szukaj "na rzecz: NAZWA" lub "na rzecz podmiotu NAZWA"
    const naRzeczMatch = f.match(/na\s+rzecz[:\s]+(?:podmiotu\s+)?([A-ZĄĆĘŁŃÓŚŹŻ][^,]{3,100}?)(?:\s*,\s*ul\.|\s*ul\.|\s*\d{2}-\d{3})/i);
    if (naRzeczMatch) {
      f = naRzeczMatch[1].trim();
    } else {
      // Fallback: szukaj nazwy po "na rzecz:"
      const simpleMatch = f.match(/na\s+rzecz[:\s]+([A-ZĄĆĘŁŃÓŚŹŻ][^\n]{3,80}?)(?:\s*$|\s*\n)/i);
      if (simpleMatch) {
        f = simpleMatch[1].trim();
      } else {
        return null; // nie da się wyciągnąć
      }
    }
  }

  return f.length > 2 ? f : null;
}

// === Wynagrodzenie cleanup ===
function cleanWynagrodzenie(val) {
  if (!val) return null;

  // Jeśli to sama liczba < 1000 bez jednostki → prawdopodobnie stawka/h
  const numMatch = val.match(/^(\d+(?:[.,]\d+)?)\s*$/);
  if (numMatch) {
    const num = parseFloat(numMatch[1].replace(",", "."));
    if (num < 1000 && num > 0) {
      return `${val} PLN/h brutto`;
    }
  }

  return null; // nie zmieniaj
}

async function main() {
  console.log(`=== Fix stanowisko + firma + wynagrodzenie (${DO_RUN ? "RUN" : "DRY-RUN"}) ===\n`);

  const bases = await db.fdkEmploymentBase.findMany({
    include: { foreigner: true },
  });

  console.log(`Sprawdzam ${bases.length} podstaw...\n`);

  let fixedStan = 0, fixedFirma = 0, fixedWyn = 0, deduped = 0;

  // === Pkt 1: Stanowisko ===
  for (const base of bases) {
    if (!base.stanowisko) continue;
    const cleaned = cleanStanowisko(base.stanowisko);
    if (cleaned !== base.stanowisko) {
      const name = `${base.foreigner.imie ?? ""} ${base.foreigner.nazwisko}`.trim();
      console.log(`  [STAN ${base.id}] ${name}: "${base.stanowisko.substring(0, 60)}" → "${(cleaned ?? "NULL").substring(0, 60)}"`);
      if (DO_RUN) {
        await db.fdkEmploymentBase.update({ where: { id: base.id }, data: { stanowisko: cleaned } });
        await db.fdkChangeLog.create({ data: { foreignerId: base.foreignerId, changedBy: CHANGED_BY, field: "stanowisko", oldValue: base.stanowisko, newValue: cleaned } });
      }
      fixedStan++;
      csvRows.push([String(base.id), String(base.foreignerId), base.foreigner.nazwisko, "stanowisko", base.stanowisko.substring(0, 120), (cleaned ?? "NULL").substring(0, 120), DO_RUN ? "fixed" : "would_fix"]);
    }
  }

  // === Pkt 2: Firma ===
  for (const base of bases) {
    if (!base.firma) continue;
    const cleaned = cleanFirma(base.firma);
    if (cleaned !== null && cleaned !== base.firma) {
      const name = `${base.foreigner.imie ?? ""} ${base.foreigner.nazwisko}`.trim();
      console.log(`  [FIRMA ${base.id}] ${name}: "${base.firma.substring(0, 60)}" → "${cleaned.substring(0, 60)}"`);
      if (DO_RUN) {
        await db.fdkEmploymentBase.update({ where: { id: base.id }, data: { firma: cleaned } });
        await db.fdkChangeLog.create({ data: { foreignerId: base.foreignerId, changedBy: CHANGED_BY, field: "firma", oldValue: base.firma, newValue: cleaned } });
      }
      fixedFirma++;
      csvRows.push([String(base.id), String(base.foreignerId), base.foreigner.nazwisko, "firma", base.firma.substring(0, 120), cleaned.substring(0, 120), DO_RUN ? "fixed" : "would_fix"]);
    }
  }

  // === Pkt 2b: Dedupe po nr dokumentu (duplikaty BRAK_DANYCH) ===
  const byDocNr = new Map();
  for (const base of bases) {
    const nr = base.nrDecyzji ?? base.nrOswiadczenia;
    if (!nr) continue;
    const key = `${base.foreignerId}_${nr}_${base.typ}`;
    if (!byDocNr.has(key)) byDocNr.set(key, []);
    byDocNr.get(key).push(base);
  }
  for (const [key, group] of byDocNr) {
    if (group.length <= 1) continue;
    // Zachowaj tę z datami, usuń BRAK_DANYCH
    const withDates = group.filter(b => b.dataOd || b.dataDo);
    const withoutDates = group.filter(b => !b.dataOd && !b.dataDo && b.status === "BRAK_DANYCH");
    if (withDates.length >= 1 && withoutDates.length >= 1) {
      for (const dup of withoutDates) {
        const name = `${dup.foreigner.imie ?? ""} ${dup.foreigner.nazwisko}`.trim();
        console.log(`  [DEDUP ${dup.id}] ${name}: duplikat BRAK_DANYCH (nr=${dup.nrDecyzji ?? dup.nrOswiadczenia})`);
        if (DO_RUN) {
          await db.fdkEmploymentBase.delete({ where: { id: dup.id } });
          await db.fdkChangeLog.create({ data: { foreignerId: dup.foreignerId, changedBy: CHANGED_BY, field: "employment_base_dedup", oldValue: `#${dup.id} ${dup.typ}`, newValue: "Usunięty duplikat BRAK_DANYCH" } });
        }
        deduped++;
        csvRows.push([String(dup.id), String(dup.foreignerId), dup.foreigner.nazwisko, "dedup", `${dup.typ} ${dup.nrDecyzji ?? dup.nrOswiadczenia}`, "DELETED", DO_RUN ? "deleted" : "would_delete"]);
      }
    }
  }

  // === Pkt 6: Wynagrodzenie bez jednostki ===
  for (const base of bases) {
    if (!base.wynagrodzenie) continue;
    const cleaned = cleanWynagrodzenie(base.wynagrodzenie);
    if (cleaned !== null && cleaned !== base.wynagrodzenie) {
      const name = `${base.foreigner.imie ?? ""} ${base.foreigner.nazwisko}`.trim();
      console.log(`  [WYN ${base.id}] ${name}: "${base.wynagrodzenie}" → "${cleaned}"`);
      if (DO_RUN) {
        await db.fdkEmploymentBase.update({ where: { id: base.id }, data: { wynagrodzenie: cleaned } });
        await db.fdkChangeLog.create({ data: { foreignerId: base.foreignerId, changedBy: CHANGED_BY, field: "wynagrodzenie", oldValue: base.wynagrodzenie, newValue: cleaned } });
      }
      fixedWyn++;
      csvRows.push([String(base.id), String(base.foreignerId), base.foreigner.nazwisko, "wynagrodzenie", base.wynagrodzenie, cleaned, DO_RUN ? "fixed" : "would_fix"]);
    }
  }

  console.log(`\n=== Podsumowanie ===`);
  console.log(`Stanowisko: ${fixedStan}`);
  console.log(`Firma: ${fixedFirma}`);
  console.log(`Dedupe: ${deduped}`);
  console.log(`Wynagrodzenie: ${fixedWyn}`);

  if (REPORT_FILE) {
    const csv = csvRows.map((r) => r.join(";")).join("\n");
    fs.writeFileSync(REPORT_FILE, csv, "utf-8");
    console.log(`Raport: ${REPORT_FILE}`);
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
