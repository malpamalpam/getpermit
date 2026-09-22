/**
 * Dogrywka 22.09 — poprawki danych:
 * - Pkt 2: Abrahimovich (378) — usuń TRC_FDK z zatrudnienia, utwórz pobyt "W procedurze"
 * - Pkt 4: van Reenen (326) — zdejmij fałszywe flagi "inna osoba" z etykiet/krajów
 * - Skan bazy: fałszywe flagi z junk names + TRC z wniosków
 *
 * Usage:
 *   node scripts/fix-dogrywka-22-09.mjs              # dry-run
 *   node scripts/fix-dogrywka-22-09.mjs --run         # wykonaj
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CHANGED_BY = "fix-dogrywka-22-09";
const DO_RUN = process.argv.includes("--run");

const JUNK_NAME_RE = [
  /nazwisk\w*\s+nadawc/i, /imi[eę]\s+i?\s*nazwisk/i, /nadawc[aey]/i,
  /podpis\s+osoby/i, /pe[lł]nomocnik/i, /adresat/i, /wnioskodawc/i,
  /cudzoziemiec/i, /strona\s+post[eę]powan/i, /^republik/i, /po[łl]udniow/i,
  /federacj/i, /rosyjsk/i, /rzeczpospolit/i, /^nr\s+/i, /^data\s+/i,
  /organ\s+wydaj/i,
];

function isJunkName(name) {
  if (!name || name.length < 3) return false;
  return JUNK_NAME_RE.some((p) => p.test(name));
}

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  DOGRYWKA 22.09 — poprawki danych`);
  console.log(`  Tryb: ${DO_RUN ? "WYKONANIE" : "DRY-RUN"}`);
  console.log(`${"=".repeat(60)}\n`);

  // ===================================================================
  // PKT 2: Abrahimovich (378) — TRC wniosek → pobyt
  // ===================================================================
  console.log("--- PKT 2: Abrahimovich (id=378) — TRC wniosek → pobyt ---");

  const abrahimovich = await db.fdkForeigner.findUnique({
    where: { id: 378 },
    include: { employmentBases: true },
  });

  if (abrahimovich) {
    console.log(`  Profil: ${abrahimovich.imie} ${abrahimovich.nazwisko}`);

    // Szukaj TRC_FDK z SC-II.6152.71.2025 (z potwierdzenia złożenia)
    const fakeBase = abrahimovich.employmentBases.find(
      (b) => b.nrDecyzji === "SC-II.6152.71.2025" && (b.typ === "TRC_FDK" || b.typ === "KARTA_POBYTU")
    );
    if (fakeBase) {
      console.log(`  [FIX] Usuwam fałszywą podstawę zatrudnienia #${fakeBase.id} (${fakeBase.typ}, nr ${fakeBase.nrDecyzji})`);
      if (DO_RUN) {
        await db.fdkEmploymentBase.delete({ where: { id: fakeBase.id } });
        await db.fdkChangeLog.create({
          data: { foreignerId: 378, changedBy: CHANGED_BY, field: "employment_base_delete",
            oldValue: `#${fakeBase.id} ${fakeBase.typ} nr=${fakeBase.nrDecyzji}`,
            newValue: "Usunięto — powstało z potwierdzenia złożenia wniosku TRC, nie z decyzji" },
        });
      }
    } else {
      console.log(`  [INFO] Brak TRC_FDK z nr SC-II.6152.71.2025 — już usunięta?`);
    }

    // Utwórz/zaktualizuj pobytową "W procedurze"
    if (!abrahimovich.upoDoreczone) {
      console.log(`  [FIX] Ustawiam upoDoreczone = 2025-01-27 (data złożenia wniosku TRC)`);
      if (DO_RUN) {
        await db.fdkForeigner.update({
          where: { id: 378 },
          data: {
            upoDoreczone: new Date("2025-01-27"),
            upoUwagi: "stempel — złożony wniosek TRC, sygn. SC-II.6152.71.2025",
          },
        });
        await db.fdkChangeLog.create({
          data: { foreignerId: 378, changedBy: CHANGED_BY, field: "residence_basis",
            oldValue: null, newValue: "Utworzono podstawę pobytową: W procedurze — stempel, data złożenia 27.01.2025" },
        });
      }
    } else {
      console.log(`  [INFO] upoDoreczone już ustawione: ${abrahimovich.upoDoreczone.toISOString().slice(0, 10)}`);
    }
  } else {
    console.log(`  [SKIP] Profil 378 nie istnieje`);
  }

  // ===================================================================
  // PKT 4: van Reenen (326) — fałszywe flagi
  // ===================================================================
  console.log("\n--- PKT 4: van Reenen (id=326) + skan bazy — fałszywe flagi ---");

  // Skan CAŁEJ bazy pod fałszywymi flagami
  const flaggedAttachments = await db.fdkAttachment.findMany({
    where: { opis: { startsWith: "\u26a0" } },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true } } },
  });

  console.log(`  Oflagowanych załączników: ${flaggedAttachments.length}`);
  let junkFlagCount = 0;
  const junkFlagList = [];

  for (const att of flaggedAttachments) {
    // Extract the "other person" name from the flag
    const match = att.opis.match(/Dokument innej osoby:\s*(.+)/);
    if (!match) continue;
    const extractedName = match[1].trim();

    if (isJunkName(extractedName)) {
      const person = `${att.foreigner.imie ?? ""} ${att.foreigner.nazwisko}`.trim();
      console.log(`  [JUNK FLAG] #${att.id} [${person}] ${att.nazwaPliku} → "${extractedName}"`);
      junkFlagCount++;
      junkFlagList.push({ attId: att.id, foreignerId: att.foreigner.id, fileName: att.nazwaPliku, junkName: extractedName, person });

      if (DO_RUN) {
        await db.fdkAttachment.update({ where: { id: att.id }, data: { opis: null } });
      }
    }
  }

  console.log(`  Fałszywych flag (junk name): ${junkFlagCount}`);
  if (junkFlagCount > 0) {
    console.log(`  → ${DO_RUN ? "Zdjęto" : "Do zdjęcia"} flagi. Pliki do rescrapowania.`);
  }

  // ===================================================================
  // SKAN: Podstawy zatrudnienia z wniosków TRC
  // ===================================================================
  console.log("\n--- SKAN: Podstawy zatrudnienia z wniosków TRC ---");

  const scrapeLogsWithWniosek = await db.fdkChangeLog.findMany({
    where: {
      field: "scrape",
      newValue: { contains: "pliku:" },
    },
    select: { foreignerId: true, newValue: true },
  });

  // Find bases created from "potwierdzenie"/"wniosek" files
  const wniosekPatterns = [/potwierdzeni/i, /wnios[ek]/i, /\bUPO\b/i, /złożeni/i, /zlozeni/i];
  let wniosekBaseCount = 0;

  for (const log of scrapeLogsWithWniosek) {
    const m = log.newValue?.match(/(?:Utworzono|Zaktualizowano)\s+podstawe\s+#(\d+)\s+\(([^)]+)\)\s+z\s+pliku:\s+(.+)$/);
    if (!m) continue;
    const [, baseIdStr, baseTyp, fileName] = m;
    // Check if the file is a wniosek/potwierdzenie
    const isWniosek = wniosekPatterns.some((p) => p.test(fileName));
    // Only flag TRC bases (not oświadczenia etc.)
    const isTrc = baseTyp.startsWith("TRC_") || baseTyp === "KARTA_POBYTU" || baseTyp === "BLUE_CARD";
    if (isWniosek && isTrc) {
      const baseId = parseInt(baseIdStr, 10);
      const base = await db.fdkEmploymentBase.findUnique({ where: { id: baseId } });
      if (base) {
        console.log(`  [WNIOSEK→ZATRUDN] #${baseId} (${baseTyp}) z pliku: ${fileName} — foreignerId=${log.foreignerId}`);
        wniosekBaseCount++;
      }
    }
  }

  console.log(`  Podstaw zatrudnienia z wniosków TRC: ${wniosekBaseCount}`);
  if (wniosekBaseCount > 0) {
    console.log(`  → Wymagają ręcznej weryfikacji — mogą być prawidłowe (np. decyzja w pliku o nazwie "potwierdzenie")`);
  }

  // ===================================================================
  // SUMMARY
  // ===================================================================
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  PODSUMOWANIE`);
  console.log(`  Tryb: ${DO_RUN ? "WYKONANIE" : "DRY-RUN"}`);
  console.log(`  Abrahimovich (378): TRC wniosek → pobyt "W procedurze"`);
  console.log(`  Fałszywe flagi (junk name): ${junkFlagCount}`);
  console.log(`  Podstawy z wniosków TRC: ${wniosekBaseCount}`);
  console.log(`${"=".repeat(60)}\n`);

  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
