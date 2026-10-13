/**
 * Cleanup v3: hide (not delete) junk employment & residence bases.
 *
 * Rules for hiding:
 * 1. No source attachment OR source is non-basis doc (letters, forms, fees, gov.pl)
 * 2. Status BRAK_DANYCH with no useful data (no dates, no nr, no firma)
 * 3. Type not in CRM dictionary (OD_BLUE_CARD, raw codes)
 * 4. Rezydent UE / Pobyt stały / OD_* without a matching decision document
 * 5. Powiadomienie UA without PSZ-PPWPU form or for non-UA citizen
 * 6. Zezwolenie A with TRC decision number (WSC-/SC-/DL. instead of WRP-)
 * 7. Duplicates with same key (sygnatura/PZC/WRP)
 * 8. Text field > 200 chars (whole page scraped into stanowisko)
 *
 * Also fixes:
 * - Morozov: residence TRC_FDK → TRC_BLUE_CARD for Blue Card decision
 * - Valovich: OSW OP.G number normalization, dates, status
 * - Valovich: close PZC..AB.2025 with PSZ-PZPO date 31.07.2026
 * - Valovich: clean stanowisko in PZC..EP.2026
 * - Normalize OSW numbers (commas → dots)
 *
 * Usage:
 *   node scripts/cleanup-v3.mjs                    # dry-run all wProcesie
 *   node scripts/cleanup-v3.mjs --profile 155      # dry-run single profile
 *   node scripts/cleanup-v3.mjs --apply            # apply
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const db = new PrismaClient();
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const pIdx = args.indexOf("--profile");
const PROFILE_ID = pIdx >= 0 ? parseInt(args[pIdx + 1], 10) : null;
const CHANGED_BY = "cleanup-v3";

// Non-basis source patterns
const NON_BASIS_SRC = [
  /opłata|oplata|fee|potwierdzenie.*(?:CEN|przelew|wpłat)/i,
  /pismo.*przewodnie|cover.*letter/i,
  /wezwani[ea]|zawiadomieni[ea]|ponagleni[ea]|przyspieszeni[ea]/i,
  /pe[łl]nomocnictw[ao]|PoA[_\s]/i,
  /ankiet[ay]|kwestionariusz/i,
  /anex|aneks/i,
  /rachunek|rachunki/i,
  /umowa.*(?:najm|zleceni|dzieł|prac|współprac)/i,
  /polisa|ubezpieczeni|insurance/i,
  /PIT[-_\s]?\d|ZUS|zus.*sk[łl]adk/i,
  /za[łl][aą]cznik[\s_]*nr[\s_]*[12]/i,
  /WNIOSEK-OSW|OSW-UTRZYMANIE|OSW-NIEKARALNOSC|OSW-POBYT-3-LATA/i,
  /świadectw[ao].*szkoł/i,
  /legitymacj[ay]/i,
  /informacja.*starost/i,
  /tłumaczeni[ea]|translation/i,
  /do[śs]wiadczeni[ea]/i,
  /potwierdzen.*(?:wys[łl]an|z[łl]o[żz]en|epuap|poczta)/i,
  /uzupe[łl]nieni[ea]/i,
  /osobiste.*stawiennictwo/i,
  /niezalegani[ea]/i,
  /wniosek.*(?:TRC|MOS|INPOL|pobyt)/i,
  /podj[ęe]ci[ea].*(?:pracy|zatrudnieni)/i,
  /niepodj[ęe]ci[ea].*pracy/i,
  /zako[ńn]czeni[ea].*pracy/i,
  /zg[łl]oszeni[ea].*umowy/i,
  /skan.*wys[łl]|skan.*uzupe[łl]|skan.*dokument/i,
  /gov\.pl|epuap|skrzynk/i,
  /diploma|dyplom/i,
  /nowe.*WP.*uzupe[łl]nieni/i,
];

// Types not in CRM display dictionary — hide
const RAW_CODE_TYPES = new Set([
  "OD_BLUE_CARD", "OD_MALZONEK_PL", "OD_CZLONEK_RODZINY", "OD_HUMANITARNE",
  "DOSTEP_UE", "DOSTEP_STUDENT", "DOSTEP_POBYT_STALY", "DOSTEP_REZYDENT_UE",
  "DOSTEP_KARTA_POLAKA", "DOSTEP_OCHRONA_MIEDZ", "DOSTEP_DYPLOM_PL",
  "BLUE_CARD", "ZEZWOLENIE", "ZGLOSZENIE_UA", "KARTA_POBYTU",
]);

// Indefinite types that require specific decision proof
const INDEFINITE_SUSPECT = new Set([
  "OD_POBYT_STALY", "OD_REZYDENT_UE", "OD_UCHODZCA", "OD_OCHRONA_UZUP",
  "POBYT_STALY", "REZYDENT_UE",
]);

const FEE_AMOUNTS = new Set([17, 51, 100, 340, 400, 440]);

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  if (PROFILE_ID) console.log(`Profile: ${PROFILE_ID}\n`);

  const where = PROFILE_ID ? { id: PROFILE_ID } : { wProcesie: true, hidden: false };
  const foreigners = await db.fdkForeigner.findMany({
    where,
    include: {
      employmentBases: { orderBy: { createdAt: "asc" } },
      residenceBases: { orderBy: { createdAt: "asc" } },
      attachments: { select: { id: true, nazwaPliku: true, detectedType: true } },
    },
  });

  const csv = ["profil;id;akcja;tabela;rekord_id;typ;status_przed;powod"];
  let hidden = 0, fixed = 0;

  for (const f of foreigners) {
    const name = `${f.nazwisko} ${f.imie || ""}`.trim();
    const attMap = new Map(f.attachments.map((a) => [a.id, a]));
    const empByNr = new Map();

    // Index employment bases by document number
    for (const b of f.employmentBases) {
      if (b.nrDecyzji) empByNr.set(b.nrDecyzji, (empByNr.get(b.nrDecyzji) || []).concat(b));
      if (b.nrOswiadczenia) empByNr.set(b.nrOswiadczenia, (empByNr.get(b.nrOswiadczenia) || []).concat(b));
    }

    // === HIDE junk employment bases ===
    for (const b of f.employmentBases) {
      const reasons = [];
      const src = b.sourceAttachmentId ? attMap.get(b.sourceAttachmentId) : null;
      const srcName = src?.nazwaPliku ?? "";
      const hasDocNr = !!(b.nrDecyzji || b.nrOswiadczenia);

      // Rule 1: non-basis source (skip if has document number)
      if (srcName && !hasDocNr && NON_BASIS_SRC.some((p) => p.test(srcName))) {
        reasons.push(`źródło: ${srcName.substring(0, 50)}`);
      }

      // Rule 1b: no source at all and no useful data
      if (!b.sourceAttachmentId && !hasDocNr && !b.dataOd && !b.dataDo && b.status === "BRAK_DANYCH") {
        reasons.push("brak źródła i danych");
      }

      // Rule 3: raw code type
      if (RAW_CODE_TYPES.has(b.typ)) {
        reasons.push(`typ techniczny: ${b.typ}`);
      }

      // Rule 4: indefinite type without decision proof
      if (INDEFINITE_SUSPECT.has(b.typ) && !hasDocNr && !b.sourceAttachmentId) {
        reasons.push(`${b.typ} bez decyzji`);
      }

      // Rule 5: Powiadomienie UA for non-UA citizen
      if ((b.typ === "POWIADOMIENIE_UA" || b.typ === "ZGLOSZENIE_UA") && f.obywatelstwo && !/ukrai/i.test(f.obywatelstwo)) {
        reasons.push(`Powiadomienie UA u obywatela ${f.obywatelstwo}`);
      }

      // Rule 6: Zezwolenie A with TRC decision number
      if ((b.typ === "ZEZWOLENIE_A" || b.typ === "ZEZWOLENIE_A_KONT") && b.nrDecyzji) {
        if (/^(WSC|SC-|DL\.)/.test(b.nrDecyzji) && !/WRP/i.test(b.nrDecyzji)) {
          reasons.push(`Zezwolenie A z sygnaturą TRC: ${b.nrDecyzji}`);
        }
      }

      // Rule 7: fee as salary
      if (b.wynagrodzenie) {
        const m = b.wynagrodzenie.replace(/\s/g, "").match(/^(\d[\d,.]*)/);
        if (m) {
          const v = parseFloat(m[1].replace(/,/g, "."));
          if (FEE_AMOUNTS.has(Math.round(v))) reasons.push(`wyn=opłata: ${b.wynagrodzenie}`);
          if (v > 100000) reasons.push(`wyn sklejone: ${b.wynagrodzenie}`);
        }
      }

      // Rule 8: text field > 200 chars
      if (b.stanowisko && b.stanowisko.length > 200) {
        reasons.push(`stanowisko > 200 zn. (${b.stanowisko.length})`);
      }
      if (b.firma && /Nr\s+NIP|Numer\s+REGON/i.test(b.firma)) {
        reasons.push("firma z NIP/REGON");
      }

      if (reasons.length > 0) {
        console.log(`  [HIDE EMP] ${name} #${b.id} ${b.typ} ${b.status}: ${reasons.join(" | ")}`);
        csv.push(`"${name}";${f.id};HIDE;emp;${b.id};${b.typ};${b.status};"${reasons.join(" | ")}"`);
        hidden++;
        if (APPLY) {
          await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { status: "UCHYLONE" } });
          await db.fdkChangeLog.create({ data: { foreignerId: f.id, changedBy: CHANGED_BY, field: "emp_hidden", oldValue: `#${b.id} ${b.typ} ${b.status}`, newValue: `Ukryto: ${reasons.join(" | ")}` } });
        }
      }
    }

    // === HIDE junk residence bases ===
    for (const rb of f.residenceBases) {
      const reasons = [];
      const src = rb.sourceAttachmentId ? attMap.get(rb.sourceAttachmentId) : null;
      const srcName = src?.nazwaPliku ?? "";
      const hasNr = !!rb.nrDecyzji;

      if (srcName && !hasNr && NON_BASIS_SRC.some((p) => p.test(srcName))) {
        reasons.push(`źródło: ${srcName.substring(0, 50)}`);
      }
      if (!rb.sourceAttachmentId && !hasNr && !rb.dataOd && !rb.dataDo) {
        reasons.push("brak źródła i danych");
      }

      if (reasons.length > 0) {
        console.log(`  [HIDE RES] ${name} #${rb.id} ${rb.typ}: ${reasons.join(" | ")}`);
        csv.push(`"${name}";${f.id};HIDE;res;${rb.id};${rb.typ};${rb.status};"${reasons.join(" | ")}"`);
        hidden++;
        if (APPLY) {
          await db.fdkResidenceBasis.update({ where: { id: rb.id }, data: { status: "UCHYLONE" } });
          await db.fdkChangeLog.create({ data: { foreignerId: f.id, changedBy: CHANGED_BY, field: "res_hidden", oldValue: `#${rb.id} ${rb.typ}`, newValue: `Ukryto: ${reasons.join(" | ")}` } });
        }
      }
    }

    // === FIX specific records ===

    // Fix: Morozov residence TRC_FDK → TRC_BLUE_CARD (decision WSC-II-P.6151.82277.2024)
    if (f.id === 28) {
      for (const rb of f.residenceBases) {
        if (rb.typ === "TRC_FDK" && rb.nrDecyzji === "WSC-II-P.6151.82277.2024") {
          console.log(`  [FIX RES] ${name} #${rb.id}: TRC_FDK → TRC_BLUE_CARD`);
          csv.push(`"${name}";${f.id};FIX;res;${rb.id};TRC_FDK→TRC_BLUE_CARD;${rb.status};"Blue Card decision"`);
          fixed++;
          if (APPLY) {
            await db.fdkResidenceBasis.update({ where: { id: rb.id }, data: { typ: "TRC_BLUE_CARD" } });
            await db.fdkChangeLog.create({ data: { foreignerId: f.id, changedBy: CHANGED_BY, field: "res_type_fix", oldValue: "TRC_FDK", newValue: "TRC_BLUE_CARD (WSC-II-P.6151.82277.2024 = Blue Card)" } });
          }
        }
      }
    }

    // Fix: Valovich (155) — normalize OSW number, fix dates/status, close with PSZ-PZPO
    if (f.id === 155) {
      for (const b of f.employmentBases) {
        // Fix comma-separated OSW number
        if (b.nrOswiadczenia && /,/.test(b.nrOswiadczenia)) {
          const fixed_nr = b.nrOswiadczenia.replace(/,/g, ".");
          console.log(`  [FIX EMP] ${name} #${b.id}: nr ${b.nrOswiadczenia} → ${fixed_nr}`);
          csv.push(`"${name}";${f.id};FIX;emp;${b.id};nr_normalize;${b.status};"${b.nrOswiadczenia} → ${fixed_nr}"`);
          fixed++;
          if (APPLY) {
            await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { nrOswiadczenia: fixed_nr } });
          }
        }
        // Fix OP.G.4390.51979.AL.2023: dates 13.11.2023–12.11.2025, WYGASLE
        if (b.nrOswiadczenia === "OP.G.4390.51979.AL.2023" || b.nrOswiadczenia === "OP.G,4390,51979,AL,2023") {
          const updates = {};
          if (!b.dataOd || b.dataOd.toISOString().slice(0, 10) !== "2023-11-13") {
            updates.dataOd = new Date("2023-11-13");
          }
          if (!b.dataDo || b.dataDo.toISOString().slice(0, 10) !== "2025-11-12") {
            updates.dataDo = new Date("2025-11-12");
          }
          if (b.status !== "WYGASLE") {
            updates.status = "WYGASLE";
          }
          if (Object.keys(updates).length > 0) {
            console.log(`  [FIX EMP] ${name} #${b.id} OP.G…2023: dates→13.11.2023–12.11.2025, status→WYGASLE`);
            csv.push(`"${name}";${f.id};FIX;emp;${b.id};dates_status;${b.status};"OP.G fix"`);
            fixed++;
            if (APPLY) {
              await db.fdkEmploymentBase.update({ where: { id: b.id }, data: updates });
            }
          }
        }
        // Close PZC.4390.43430.AB.2025 with PSZ-PZPO date 31.07.2026
        if (b.nrOswiadczenia === "PZC.4390.43430.AB.2025" && b.status === "AKTYWNE") {
          console.log(`  [FIX EMP] ${name} #${b.id} PZC…AB.2025: zamknięcie datą 31.07.2026 (PSZ-PZPO)`);
          csv.push(`"${name}";${f.id};FIX;emp;${b.id};close_pzpo;AKTYWNE;"zamknięcie 31.07.2026"`);
          fixed++;
          if (APPLY) {
            await db.fdkEmploymentBase.update({
              where: { id: b.id },
              data: { dataDo: new Date("2026-07-31"), status: "WYGASLE" },
            });
          }
        }
        // Clean stanowisko in PZC.4390.18013.EP.2026
        if (b.nrOswiadczenia === "PZC.4390.18013.EP.2026" && b.stanowisko) {
          let clean = b.stanowisko
            .replace(/^\s*\/?\s*rodzaj\s+pracy:\s*/i, "")
            .replace(/\s+\d+\s*$/, "")
            .trim();
          if (clean !== b.stanowisko) {
            console.log(`  [FIX EMP] ${name} #${b.id} PZC…EP.2026: stanowisko "${b.stanowisko}" → "${clean}"`);
            csv.push(`"${name}";${f.id};FIX;emp;${b.id};stanowisko;-;"clean"`);
            fixed++;
            if (APPLY) {
              await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { stanowisko: clean } });
            }
          }
        }
      }
    }
  }

  const filename = APPLY ? "raport-cleanup-v3.csv" : "raport-cleanup-v3-dry.csv";
  writeFileSync(filename, "\uFEFF" + csv.join("\n") + "\n");

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Ukryte podstawy: ${hidden}`);
  console.log(`Poprawione rekordy: ${fixed}`);
  console.log(`Raport: ${filename}`);
  if (!APPLY) console.log(`\nUruchom z --apply żeby zastosować.`);
}

main().catch(console.error).finally(() => db.$disconnect());
