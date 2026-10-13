/**
 * Cleanup v3: hide junk bases + fix specific records.
 *
 * HIDE rules (set status=NIEAKTYWNE, log reason):
 * 1. No source OR source is non-basis doc
 * 2. Status BRAK_DANYCH (no useful data)
 * 3. Pobyt stały/Rezydent UE/OD_* without matching decision in profile
 * 4. Powiadomienie UA without PSZ-PPWPU or for non-UA citizen
 * 5. Zezwolenie A with non-WRP number (e.g. TRC decision sygnatura)
 * 6. Duplicate key (same sygnatura/PZC/WRP) — keep fuller record
 * 7. Type not in CRM dictionary (OD_BLUE_CARD etc.)
 *
 * FIX records:
 * - Morozov #28: residence TRC_FDK → TRC_BLUE_CARD
 * - Valovich #155: OSW OP.G number/dates/status; close PZC..AB.2025; clean stanowisko
 *
 * Usage:
 *   node scripts/cleanup-v3.mjs --profile 155     # dry-run
 *   node scripts/cleanup-v3.mjs --apply           # apply all wProcesie
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const db = new PrismaClient();
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const pIdx = args.indexOf("--profile");
const PROFILE_ID = pIdx >= 0 ? parseInt(args[pIdx + 1], 10) : null;
const CHANGED_BY = "cleanup-v3";

// Source patterns that indicate non-basis documents
const NON_BASIS_SRC = [
  /opłata|oplata|fee|potwierdzenie.*(?:CEN|przelew|wpłat)/i,
  /pismo|cover.*letter/i, /wezwani[ea]|zawiadomieni[ea]|ponagleni[ea]|przyspieszeni[ea]/i,
  /pe[łl]nomocnictw[ao]|PoA[_\s]/i, /ankiet[ay]|kwestionariusz/i,
  /anex|aneks/i, /rachunek|rachunki/i,
  /umowa.*(?:najm|zleceni|dzieł|prac|współprac)/i,
  /polisa|ubezpieczeni|insurance/i, /PIT[-_\s]?\d|ZUS/i,
  /za[łl][aą]cznik[\s_]*nr[\s_]*[12]/i,
  /WNIOSEK-OSW|OSW-UTRZYMANIE|OSW-NIEKARALNOSC|OSW-POBYT-3-LATA/i,
  /świadectw[ao]|legitymacj[ay]/i, /informacja.*starost/i,
  /tłumaczeni[ea]|translation|do[śs]wiadczeni[ea]/i,
  /potwierdzen.*(?:wys[łl]an|z[łl]o[żz]en|epuap|poczta)/i,
  /uzupe[łl]nieni[ea]/i, /osobiste.*stawiennictwo/i, /niezalegani[ea]/i,
  /wniosek.*(?:TRC|MOS|INPOL|pobyt)/i,
  /podj[ęe]ci[ea].*(?:pracy|zatrudnieni)/i, /niepodj[ęe]ci[ea]/i,
  /zako[ńn]czeni[ea].*pracy/i, /zg[łl]oszeni[ea].*umowy/i,
  /skan.*(?:wys[łl]|uzupe[łl]|dokument)/i, /gov\.pl|epuap|skrzynk/i,
  /diploma|dyplom/i,
];

// Raw code types not in CRM display dictionary
const RAW_TYPES = new Set([
  "OD_BLUE_CARD", "OD_MALZONEK_PL", "OD_CZLONEK_RODZINY", "OD_HUMANITARNE",
  "DOSTEP_UE", "DOSTEP_STUDENT", "DOSTEP_POBYT_STALY", "DOSTEP_REZYDENT_UE",
  "DOSTEP_KARTA_POLAKA", "DOSTEP_OCHRONA_MIEDZ", "DOSTEP_DYPLOM_PL",
  "BLUE_CARD", "ZEZWOLENIE", "ZGLOSZENIE_UA", "KARTA_POBYTU",
]);

// Indefinite types that require proof
const INDEF_SUSPECT = new Set([
  "OD_POBYT_STALY", "OD_REZYDENT_UE", "OD_UCHODZCA", "OD_OCHRONA_UZUP",
  "POBYT_STALY", "REZYDENT_UE",
]);

const FEE_AMOUNTS = new Set([17, 51, 100, 340, 400, 440]);

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  const where = PROFILE_ID ? { id: PROFILE_ID } : { wProcesie: true, hidden: false };
  const foreigners = await db.fdkForeigner.findMany({
    where,
    include: {
      employmentBases: { orderBy: { createdAt: "asc" } },
      residenceBases: { orderBy: { createdAt: "asc" } },
      attachments: { select: { id: true, nazwaPliku: true, detectedType: true } },
    },
  });

  const csv = ["profil;id;akcja;tabela;rekord_id;typ;stan_przed;stan_po;powod"];
  let hiddenCount = 0, fixedCount = 0;

  for (const f of foreigners) {
    const name = `${f.nazwisko} ${f.imie || ""}`.trim();
    const attMap = new Map(f.attachments.map((a) => [a.id, a]));

    // Track seen document numbers for duplicate detection
    const seenNr = new Map(); // nr → base with most data

    // =============================================
    // HIDE junk employment bases
    // =============================================
    for (const b of f.employmentBases) {
      if (b.status === "NIEAKTYWNE" || b.status === "UCHYLONE") continue; // already hidden
      const reasons = [];
      const src = b.sourceAttachmentId ? attMap.get(b.sourceAttachmentId) : null;
      const srcName = src?.nazwaPliku ?? "";
      const hasDocNr = !!(b.nrDecyzji || b.nrOswiadczenia);

      // Rule 1: non-basis source (skip if has document number — may contain real decision)
      if (srcName && !hasDocNr && NON_BASIS_SRC.some((p) => p.test(srcName))) {
        reasons.push(`źródło: ${srcName.substring(0, 60)}`);
      }
      // Rule 1b: no source at all
      if (!b.sourceAttachmentId && !hasDocNr) {
        reasons.push("brak dokumentu źródłowego");
      }

      // Rule 2: BRAK_DANYCH with no useful data
      if (b.status === "BRAK_DANYCH" && !b.dataOd && !b.dataDo && !hasDocNr && !b.firma) {
        reasons.push("BRAK_DANYCH bez żadnych danych");
      }

      // Rule 3: indefinite type without decision proof
      if (INDEF_SUSPECT.has(b.typ) && !hasDocNr && !b.sourceAttachmentId) {
        reasons.push(`${b.typ} bez decyzji`);
      }

      // Rule 4: Powiadomienie UA for non-UA citizen or without PSZ-PPWPU
      if ((b.typ === "POWIADOMIENIE_UA" || b.typ === "ZGLOSZENIE_UA")) {
        if (f.obywatelstwo && !/ukrai/i.test(f.obywatelstwo) && !f.ochronaCzasowaUkr) {
          reasons.push(`Powiadomienie UA u obywatela ${f.obywatelstwo}`);
        }
        // Check if source is PSZ-PPWPU
        if (srcName && !/PSZ-PPWPU/i.test(srcName) && !/powiadomienie/i.test(srcName)) {
          reasons.push("Powiadomienie UA bez formularza PSZ-PPWPU");
        }
      }

      // Rule 5: Zezwolenie A with TRC decision number
      if ((b.typ === "ZEZWOLENIE_A" || b.typ === "ZEZWOLENIE_A_KONT") && b.nrDecyzji) {
        if (/^(WSC|SC-|DL\.)/.test(b.nrDecyzji) && !/WRP/i.test(b.nrDecyzji)) {
          reasons.push(`Zezwolenie A z sygnaturą TRC: ${b.nrDecyzji}`);
        }
      }
      // Rule 5b: Zezwolenie A without any number and without source
      if ((b.typ === "ZEZWOLENIE_A" || b.typ === "ZEZWOLENIE_A_KONT") && !b.nrDecyzji && !b.sourceAttachmentId) {
        reasons.push("Zezwolenie A bez numeru i bez dokumentu");
      }

      // Rule 7: raw code type
      if (RAW_TYPES.has(b.typ)) {
        reasons.push(`typ techniczny: ${b.typ}`);
      }

      // Fee as salary
      if (b.wynagrodzenie) {
        const m = b.wynagrodzenie.replace(/\s/g, "").match(/^(\d[\d,.]*)/);
        if (m) {
          const v = parseFloat(m[1].replace(/,/g, "."));
          if (FEE_AMOUNTS.has(Math.round(v))) reasons.push(`wyn=opłata: ${b.wynagrodzenie}`);
          if (v > 100000) reasons.push(`wyn sklejone: ${b.wynagrodzenie}`);
        }
      }

      // Text field > 200 chars
      if (b.stanowisko && b.stanowisko.length > 200) {
        reasons.push(`stanowisko > 200 zn.`);
      }
      if (b.firma && /Nr\s+NIP|Numer\s+REGON/i.test(b.firma)) {
        reasons.push("firma z NIP/REGON");
      }

      if (reasons.length > 0) {
        console.log(`  [HIDE EMP] ${name} #${b.id} ${b.typ} (${b.status}): ${reasons.join(" | ")}`);
        csv.push(`"${name}";${f.id};HIDE;emp;${b.id};${b.typ};${b.status};NIEAKTYWNE;"${reasons.join(" | ")}"`);
        hiddenCount++;
        if (APPLY) {
          await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { status: "NIEAKTYWNE" } });
          await db.fdkChangeLog.create({ data: { foreignerId: f.id, changedBy: CHANGED_BY, field: "emp_hidden", oldValue: `#${b.id} ${b.typ} ${b.status}`, newValue: `Ukryto: ${reasons.join(" | ")}` } });
        }
      }

      // Rule 6: track for duplicate detection
      const key = b.nrDecyzji || b.nrOswiadczenia;
      if (key && reasons.length === 0) {
        const existing = seenNr.get(key);
        if (existing) {
          // Keep the one with more data
          const aScore = (existing.dataOd ? 1 : 0) + (existing.dataDo ? 1 : 0) + (existing.firma ? 1 : 0) + (existing.stanowisko ? 1 : 0);
          const bScore = (b.dataOd ? 1 : 0) + (b.dataDo ? 1 : 0) + (b.firma ? 1 : 0) + (b.stanowisko ? 1 : 0);
          const toHide = bScore <= aScore ? b : existing;
          if (bScore > aScore) seenNr.set(key, b);
          console.log(`  [HIDE DUP] ${name} #${toHide.id} ${toHide.typ}: duplikat klucza ${key}`);
          csv.push(`"${name}";${f.id};HIDE_DUP;emp;${toHide.id};${toHide.typ};${toHide.status};NIEAKTYWNE;"duplikat: ${key}"`);
          hiddenCount++;
          if (APPLY) {
            await db.fdkEmploymentBase.update({ where: { id: toHide.id }, data: { status: "NIEAKTYWNE" } });
            await db.fdkChangeLog.create({ data: { foreignerId: f.id, changedBy: CHANGED_BY, field: "emp_dup_hidden", oldValue: `#${toHide.id}`, newValue: `Duplikat klucza ${key}, zachowano #${toHide === b ? existing.id : b.id}` } });
          }
        } else {
          seenNr.set(key, b);
        }
      }
    }

    // =============================================
    // HIDE junk residence bases (same rules 1-3, 7)
    // =============================================
    for (const rb of f.residenceBases) {
      if (rb.status === "NIEAKTYWNE" || rb.status === "UCHYLONE") continue;
      const reasons = [];
      const src = rb.sourceAttachmentId ? attMap.get(rb.sourceAttachmentId) : null;
      const srcName = src?.nazwaPliku ?? "";
      const hasNr = !!rb.nrDecyzji;

      if (srcName && !hasNr && NON_BASIS_SRC.some((p) => p.test(srcName))) {
        reasons.push(`źródło: ${srcName.substring(0, 60)}`);
      }
      if (!rb.sourceAttachmentId && !hasNr && !rb.dataOd && !rb.dataDo) {
        reasons.push("brak źródła i danych");
      }

      if (reasons.length > 0) {
        console.log(`  [HIDE RES] ${name} #${rb.id} ${rb.typ}: ${reasons.join(" | ")}`);
        csv.push(`"${name}";${f.id};HIDE;res;${rb.id};${rb.typ};${rb.status};NIEAKTYWNE;"${reasons.join(" | ")}"`);
        hiddenCount++;
        if (APPLY) {
          await db.fdkResidenceBasis.update({ where: { id: rb.id }, data: { status: "NIEAKTYWNE" } });
          await db.fdkChangeLog.create({ data: { foreignerId: f.id, changedBy: CHANGED_BY, field: "res_hidden", oldValue: `#${rb.id} ${rb.typ}`, newValue: `Ukryto: ${reasons.join(" | ")}` } });
        }
      }
    }

    // =============================================
    // FIX specific records
    // =============================================

    // ALL profiles: if employment base is TRC_BLUE_CARD but matching residence is TRC_FDK → fix residence
    for (const eb of f.employmentBases) {
      if (eb.typ !== "TRC_BLUE_CARD" || !eb.nrDecyzji) continue;
      for (const rb of f.residenceBases) {
        if (rb.nrDecyzji === eb.nrDecyzji && rb.typ === "TRC_FDK") {
          console.log(`  [FIX BLUE] ${name} residence #${rb.id}: TRC_FDK → TRC_BLUE_CARD (${rb.nrDecyzji})`);
          csv.push(`"${name}";${f.id};FIX;res;${rb.id};TRC_FDK;${rb.status};TRC_BLUE_CARD;"Blue Card z emp #${eb.id}"`);
          fixedCount++;
          if (APPLY) {
            await db.fdkResidenceBasis.update({ where: { id: rb.id }, data: { typ: "TRC_BLUE_CARD" } });
            await db.fdkChangeLog.create({ data: { foreignerId: f.id, changedBy: CHANGED_BY, field: "res_blue_card_fix", oldValue: `TRC_FDK (${rb.nrDecyzji})`, newValue: "TRC_BLUE_CARD" } });
          }
        }
      }
    }

    // Valovich #155: fix OSW records
    if (f.id === 155) {
      for (const b of f.employmentBases) {
        // Normalize comma-separated OSW number
        if (b.nrOswiadczenia && /,/.test(b.nrOswiadczenia)) {
          const newNr = b.nrOswiadczenia.replace(/,/g, ".");
          console.log(`  [FIX] ${name} emp #${b.id}: nr ${b.nrOswiadczenia} → ${newNr}`);
          csv.push(`"${name}";${f.id};FIX;emp;${b.id};nr;${b.nrOswiadczenia};${newNr};"normalizacja"`);
          fixedCount++;
          if (APPLY) await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { nrOswiadczenia: newNr } });
        }

        // Fix OP.G.4390.51979.AL.2023 — correct dates and status
        if (b.nrOswiadczenia === "OP.G.4390.51979.AL.2023" || b.nrOswiadczenia === "OP.G,4390,51979,AL,2023") {
          const fixes = {};
          if (!b.dataOd || b.dataOd.toISOString().slice(0, 10) !== "2023-11-13") fixes.dataOd = new Date("2023-11-13");
          if (!b.dataDo || b.dataDo.toISOString().slice(0, 10) !== "2025-11-12") fixes.dataDo = new Date("2025-11-12");
          if (b.status !== "WYGASLE") fixes.status = "WYGASLE";
          if (b.nrOswiadczenia?.includes(",")) fixes.nrOswiadczenia = "OP.G.4390.51979.AL.2023";
          if (Object.keys(fixes).length > 0) {
            console.log(`  [FIX] ${name} emp #${b.id} OP.G…2023: daty 13.11.2023–12.11.2025, WYGASŁE`);
            csv.push(`"${name}";${f.id};FIX;emp;${b.id};dates+status;${b.status};WYGASLE;"OP.G fix"`);
            fixedCount++;
            if (APPLY) await db.fdkEmploymentBase.update({ where: { id: b.id }, data: fixes });
          }
        }

        // Close PZC.4390.43430.AB.2025 — PSZ-PZPO zakończenie pracy 31.07.2026
        if (b.nrOswiadczenia === "PZC.4390.43430.AB.2025" && b.status === "AKTYWNE") {
          console.log(`  [FIX] ${name} emp #${b.id} PZC…AB.2025: zamknięcie 31.07.2026 (PSZ-PZPO)`);
          csv.push(`"${name}";${f.id};FIX;emp;${b.id};close;AKTYWNE;WYGASLE;"PSZ-PZPO 31.07.2026"`);
          fixedCount++;
          if (APPLY) await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { dataDo: new Date("2026-07-31"), status: "WYGASLE" } });
        }

        // Clean stanowisko + fill missing fields in PZC.4390.18013.EP.2026
        if (b.nrOswiadczenia === "PZC.4390.18013.EP.2026") {
          const updates = {};
          if (b.stanowisko) {
            let clean = b.stanowisko.replace(/^\s*\/?\s*rodzaj\s+pracy:\s*/i, "").replace(/\s+\d+\s*$/, "").trim();
            if (clean !== b.stanowisko) {
              updates.stanowisko = clean;
              console.log(`  [FIX] ${name} emp #${b.id}: stanowisko → "${clean}"`);
            }
          }
          if (!b.rodzajUmowy) {
            updates.rodzajUmowy = "umowa zlecenie";
            console.log(`  [FIX] ${name} emp #${b.id}: rodzajUmowy → "umowa zlecenie"`);
          }
          if (!b.firma) {
            updates.firma = "FUNDACJA FIRMA DLA KAŻDEGO";
            console.log(`  [FIX] ${name} emp #${b.id}: firma → "FUNDACJA FIRMA DLA KAŻDEGO"`);
          }
          if (Object.keys(updates).length > 0) {
            csv.push(`"${name}";${f.id};FIX;emp;${b.id};fields;-;-;"stanowisko+umowa+firma"`);
            fixedCount++;
            if (APPLY) await db.fdkEmploymentBase.update({ where: { id: b.id }, data: updates });
          }
        }
      }
    }
  }

  const filename = APPLY ? "raport-cleanup-v3.csv" : "raport-cleanup-v3-dry.csv";
  writeFileSync(filename, "\uFEFF" + csv.join("\n") + "\n");

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Ukryte: ${hiddenCount} | Poprawione: ${fixedCount}`);
  console.log(`Raport: ${filename}`);
  if (!APPLY) console.log(`\nUruchom z --apply żeby zastosować.`);
}

main().catch(console.error).finally(() => db.$disconnect());
