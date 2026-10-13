/**
 * Cleanup script: remove junk employment/residence bases and reclassify folders.
 *
 * Phase 1: Delete junk bases (from fees, procedural docs, concatenated salaries)
 * Phase 2: Reclassify attachment folders using new 6-folder system
 * Phase 3: Fix false "inna osoba" flags
 * Phase 4: Fix passport = residence card number
 *
 * Usage:
 *   node scripts/cleanup-bases.mjs                    # dry-run all wProcesie profiles
 *   node scripts/cleanup-bases.mjs --apply            # apply changes
 *   node scripts/cleanup-bases.mjs --profile 28       # dry-run single profile (Morozov)
 *   node scripts/cleanup-bases.mjs --profile 28 --apply
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const db = new PrismaClient();
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const profileIdx = args.indexOf("--profile");
const PROFILE_ID = profileIdx >= 0 ? parseInt(args[profileIdx + 1], 10) : null;
const CHANGED_BY = "cleanup-bases-v2";

// ============================================================================
// Junk detection rules
// ============================================================================

const FEE_AMOUNTS = new Set([17, 51, 100, 340, 400, 440]);
// 50 PLN can be valid hourly rate — only flag as fee when in monthly context

const JUNK_SOURCE_PATTERNS = [
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
  /za[łl][aą]cznik\s*nr\s*[12]/i,
  /WNIOSEK-OSW|OSW-UTRZYMANIE|OSW-NIEKARALNOSC|OSW-POBYT-3-LATA/i,
  /świadectw[ao].*szkoł/i,
  /legitymacj[ay].*(?:studenck|szkoln)/i,
  /informacja.*starost/i,
  /tłumaczeni[ea]|translation/i,
  /do[śs]wiadczeni[ea].*orygina/i,
  /potwierdzen.*(?:wys[łl]an|z[łl]o[żz]en|epuap|poczta)/i,
  /uzupe[łl]nieni[ea](?!.*decyzj)/i,
  /osobiste.*stawiennictwo/i,
  /niezalegani[ea]/i,
  /wniosek.*(?:TRC|MOS|INPOL|pobyt)/i,
  /podj[ęe]ci[ea].*(?:pracy|zatrudnieni)/i,
  /niepodj[ęe]ci[ea].*pracy/i,
  /zako[ńn]czeni[ea].*pracy/i,
  /zg[łl]oszeni[ea].*umowy/i,
  /skan.*wys[łl].*dok|skan.*uzupe[łl]/i,
];

const FALSE_INNA_OSOBA = [
  /^I Nazwisko/i, /Poprzednie Rodowe/i, /Odojcowskie/i,
  /^Pl Pl$/i, /\bMp$/i, /^Krs$/i, /^Poland$/i,
  /Paszport$/i, /Nadawcy$/i, /Pełnomocnik/i,
  /Pozostałych/i, /Noszone Po/i, /^Urodzony/i,
  /Lub Imion/i, /GRAŻYNA KOWALSKA/i,
];

// ============================================================================
// Folder reclassification (mirrors src/lib/folder-classifier.ts)
// ============================================================================

const WAZNE_TYPES = new Set([
  "ZEZWOLENIE_A", "ZEZWOLENIE_A_KONT", "TRC_FDK", "TRC_INNY_PRACODAWCA",
  "TRC_STUDIA", "TRC_POBYT_Z_CUDZ", "TRC_MALZONEK_PL", "TRC_HUMANITARNE",
  "TRC_ABSOLWENT", "TRC_BLUE_CARD", "TRC_DZIALALNOSC", "TRC_INNE_OKOLICZNOSCI",
  "KARTA_POBYTU", "POBYT_CUKR", "OSWIADCZENIE", "POWIADOMIENIE_UA", "ZGLOSZENIE_UA",
  "WIZA", "WIZA_HUMANITARNA", "POBYT_STALY", "REZYDENT_UE", "STATUS_UCHODZCY",
  "OCHRONA_UZUPELNIAJACA", "ZGODA_HUMANITARNA", "OBYWATEL_UE", "UMOWA_WYSTAPIENIA",
  "RUCH_BEZWIZOWY", "POBYT_NA_PRZEDLUZENIU", "PESEL_UKR", "KARTA_POLAKA",
  "STATUS_STUDENTA", "STATUS_ABSOLWENTA", "ODWOLANIE",
  "OD_POBYT_STALY", "OD_REZYDENT_UE", "OD_MALZONEK_PL", "OD_CZLONEK_RODZINY",
  "OD_BLUE_CARD", "OD_HUMANITARNE", "OD_OCHRONA_UZUP", "OD_STUDENT", "OD_UE",
  "OD_UK_WYSTAPIENIE", "OD_UCHODZCA", "OD_WIZA_HUMAN", "OD_ABSOLWENT", "OD_KARTA_POLAKA",
]);
const WAZNE_FN = [
  /paszport/i, /passport/i, /dyplom/i, /diploma/i, /decyzj[aiy]/i, /decision/i,
  /karta[\s_-]*pobytu/i, /zezwoleni[ea][\s_-]*na[\s_-]*prac/i,
  /wiza/i, /visa/i, /rezydent/i, /odwo[łl]anie/i, /\bWP[\s_-]?\d{4}/i, /\bKP[\s_-]?skan/i,
];
const OSW_FN = [
  /WNIOSEK-OSW/i, /PSZ-OPPC|PSZ-OPWP|PSZ-ZOPP/i, /PSZ-PPPO|PSZ-PZPO|PGP-UZC/i,
  /podj[ęe]ci[ea].*(?:pracy|zatrudnieni)/i, /niepodj[ęe]ci[ea].*pracy/i,
  /zako[ńn]czeni[ea].*pracy/i, /zg[łl]oszeni[ea].*umowy/i, /o[śs]w.*draft/i,
];
const TRC_FN = [
  /wniosek.*(?:pobyt|TRC|MOS|INPOL)/i, /za[łl][aą]cznik\s*nr\s*[12]/i,
  /stempel/i, /\bupo\b/i, /wezwani[ea]/i, /zawiadomieni[ea]/i, /ponagleni[ea]/i,
  /przyspieszeni[ea]/i, /uzupe[łl]nieni[ea]/i,
  /op[łl]ata.*(?:skarbow|440|100\s*PLN|pobyt|kart)/i,
  /pe[łl]nomocnictw[ao]|PoA[_\s]/i, /pismo.*przewodni/i,
  /OSW-UTRZYMANIE/i, /OSW-NIEKARALNOSC/i, /OSW-POBYT-3-LATA/i,
  /o[śs]wiadczeni[ea].*(?:utrzymani|niekaraln|pobyt.*3.*lat|liczb.*os[oó]b)/i,
  /umowa.*najm/i, /polisa|ubezpieczeni/i, /PIT[-_\s]?\d|ZUS(?:[\s_]|$)/i,
  /rachunek|rachunki/i, /umowa.*(?:dzieł|zleceni|prac|współprac)/i, /anex|aneks/i,
  /informacja.*starost/i, /t[łl]umaczeni[ea]/i, /do[śs]wiadczeni[ea]/i,
  /potwierdzen.*(?:wys[łl]an|z[łl]o[żz]en|epuap|poczta|CEN\d)/i,
];
const ZEZW_FN = [/wniosek.*zezwoleni.*prac/i, /WRP[-.\s]/i];

function classifyFolder(detectedType, isDiffPerson, filename, kategoria) {
  if (isDiffPerson) return "dokumenty_rodziny";
  if (detectedType && WAZNE_TYPES.has(detectedType)) return "wazne";
  const fn = filename.toLowerCase();
  if (OSW_FN.some((p) => p.test(fn))) return "oswiadczenie";
  if (ZEZW_FN.some((p) => p.test(fn))) return "zezwolenie";
  if (TRC_FN.some((p) => p.test(fn))) return "trc";
  if (kategoria && /^trc/i.test(kategoria)) return "trc";
  if (WAZNE_FN.some((p) => p.test(fn))) return "wazne";
  return "inne_dokumenty";
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  if (PROFILE_ID) console.log(`Profile: ${PROFILE_ID}`);

  const where = PROFILE_ID ? { id: PROFILE_ID } : { wProcesie: true, hidden: false };
  const foreigners = await db.fdkForeigner.findMany({
    where,
    include: { employmentBases: true, residenceBases: true, attachments: true },
    orderBy: { id: "asc" },
  });

  console.log(`Processing ${foreigners.length} profiles\n`);

  const csvLines = ["profil;id;akcja;tabela;rekord_id;typ;powod;zrodlo"];
  let totalBasesDeleted = 0, totalFoldersFixed = 0, totalFlagsFixed = 0, totalPassportFixed = 0;

  for (const f of foreigners) {
    const name = `${f.nazwisko} ${f.imie || ""}`.trim();
    const attMap = new Map(f.attachments.map((a) => [a.id, a]));

    // === Phase 1: Remove junk employment bases ===
    for (const base of f.employmentBases) {
      const reasons = [];
      const srcAtt = base.sourceAttachmentId ? attMap.get(base.sourceAttachmentId) : null;
      const srcName = srcAtt?.nazwaPliku ?? "";

      // Skip filename-based junk detection if the base has a valid document number
      // (the file may be named "uzupełnienie..." but contain a real decision)
      const hasDocNumber = !!(base.nrDecyzji || base.nrOswiadczenia);
      if (srcName && !hasDocNumber && JUNK_SOURCE_PATTERNS.some((p) => p.test(srcName))) {
        reasons.push(`źródło proceduralny: ${srcName.substring(0, 60)}`);
      }
      if (base.wynagrodzenie) {
        const numMatch = base.wynagrodzenie.replace(/\s/g, "").match(/^(\d[\d,.]*)/);
        if (numMatch) {
          const val = parseFloat(numMatch[1].replace(/,/g, "."));
          if (FEE_AMOUNTS.has(Math.round(val))) reasons.push(`wyn=opłata: ${base.wynagrodzenie}`);
          if (val > 100000) reasons.push(`wyn sklejone: ${base.wynagrodzenie}`);
        }
      }
      if (base.firma && /Nr\s+NIP|Numer\s+REGON/i.test(base.firma)) {
        reasons.push(`firma z NIP/REGON`);
      }

      if (reasons.length > 0) {
        const r = reasons.join(" | ");
        console.log(`  [DEL EMP] ${name} #${base.id} ${base.typ}: ${r}`);
        csvLines.push(`"${name}";${f.id};DELETE;emp;${base.id};${base.typ};"${r}";"${srcName}"`);
        totalBasesDeleted++;
        if (APPLY) {
          await db.fdkEmploymentBase.delete({ where: { id: base.id } });
          await db.fdkChangeLog.create({ data: { foreignerId: f.id, changedBy: CHANGED_BY, field: "employment_base_deleted", oldValue: `#${base.id} ${base.typ}`, newValue: `Usunięto: ${r}` } });
        }
      }
    }

    // === Phase 1b: Remove junk residence bases ===
    for (const rb of f.residenceBases) {
      const reasons = [];
      const srcAtt = rb.sourceAttachmentId ? attMap.get(rb.sourceAttachmentId) : null;
      const srcName = srcAtt?.nazwaPliku ?? "";
      const hasDocNr = !!rb.nrDecyzji;
      if (srcName && !hasDocNr && JUNK_SOURCE_PATTERNS.some((p) => p.test(srcName))) {
        reasons.push(`źródło proceduralny: ${srcName.substring(0, 60)}`);
      }
      if (reasons.length > 0) {
        console.log(`  [DEL RES] ${name} #${rb.id} ${rb.typ}: ${reasons.join(" | ")}`);
        csvLines.push(`"${name}";${f.id};DELETE;res;${rb.id};${rb.typ};"${reasons.join(" | ")}";"${srcName}"`);
        totalBasesDeleted++;
        if (APPLY) {
          await db.fdkResidenceBasis.delete({ where: { id: rb.id } });
          await db.fdkChangeLog.create({ data: { foreignerId: f.id, changedBy: CHANGED_BY, field: "residence_base_deleted", oldValue: `#${rb.id} ${rb.typ}`, newValue: `Usunięto: ${reasons.join(" | ")}` } });
        }
      }
    }

    // === Phase 2: Reclassify folders ===
    for (const att of f.attachments) {
      if (att.folderManual) continue;
      const isDiff = att.opis?.startsWith("\u26a0") && /inn(?:ej|a)\s+osob/i.test(att.opis);
      const newFolder = classifyFolder(att.detectedType, isDiff, att.nazwaPliku, att.kategoria);
      if (att.folder !== newFolder) {
        csvLines.push(`"${name}";${f.id};FOLDER;att;${att.id};${att.detectedType || "-"};"${att.folder || "(brak)"} → ${newFolder}";"${att.nazwaPliku}"`);
        totalFoldersFixed++;
        if (APPLY) {
          await db.fdkAttachment.update({ where: { id: att.id }, data: { folder: newFolder } });
        }
      }
    }

    // === Phase 3: Fix false "inna osoba" flags ===
    for (const att of f.attachments) {
      if (!att.opis?.startsWith("\u26a0 Dokument innej osoby")) continue;
      const m = att.opis.match(/innej osoby:\s*(.+)/);
      const detected = m ? m[1].trim() : "";
      if (FALSE_INNA_OSOBA.some((p) => p.test(detected))) {
        csvLines.push(`"${name}";${f.id};FIX_FLAG;att;${att.id};-;"Fałszywa: ${detected}";"${att.nazwaPliku}"`);
        totalFlagsFixed++;
        if (APPLY) {
          const nf = classifyFolder(att.detectedType, false, att.nazwaPliku, att.kategoria);
          await db.fdkAttachment.update({ where: { id: att.id }, data: { opis: null, folder: att.folderManual ? att.folder : nf } });
          await db.fdkChangeLog.create({ data: { foreignerId: f.id, changedBy: CHANGED_BY, field: "flag_fixed", oldValue: att.opis, newValue: `Usunięto fałszywą flagę: ${detected}` } });
        }
      }
    }

    // === Phase 4: Fix passport = residence card ===
    if (f.nrPaszportu && /^(RP|RS|RR|RT|RN)\d{7}$/.test(f.nrPaszportu)) {
      csvLines.push(`"${name}";${f.id};FIX_PASSPORT;foreigner;${f.id};-;"${f.nrPaszportu} → null";"-"`);
      totalPassportFixed++;
      if (APPLY) {
        await db.fdkForeigner.update({ where: { id: f.id }, data: { nrPaszportu: null } });
        await db.fdkChangeLog.create({ data: { foreignerId: f.id, changedBy: CHANGED_BY, field: "nrPaszportu", oldValue: f.nrPaszportu, newValue: "Usunięto nr karty pobytu z pola paszportu" } });
      }
    }
  }

  const filename = APPLY ? "raport-cleanup-v2.csv" : "raport-cleanup-v2-dry.csv";
  writeFileSync(filename, "\uFEFF" + csvLines.join("\n") + "\n");

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Podstawy do usunięcia: ${totalBasesDeleted}`);
  console.log(`Foldery do reklasyfikacji: ${totalFoldersFixed}`);
  console.log(`Fałszywe flagi: ${totalFlagsFixed}`);
  console.log(`Nr paszportu (karta): ${totalPassportFixed}`);
  console.log(`Raport: ${filename}`);
  if (!APPLY) console.log(`\nUruchom z --apply żeby zastosować.`);
}

main().catch(console.error).finally(() => db.$disconnect());
