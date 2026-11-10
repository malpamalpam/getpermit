/**
 * Reclassify all attachment folders using updated rules.
 * Inlines classifier logic (can't import TS modules from mjs).
 *
 * Usage:
 *   node scripts/reclassify-folders.mjs              # dry-run counts
 *   node scripts/reclassify-folders.mjs --csv        # dry-run CSV
 *   node scripts/reclassify-folders.mjs --apply      # apply
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const CSV = process.argv.includes("--csv");

// --- Inlined classifier (mirrors src/lib/folder-classifier.ts) ---

const WAZNE_TYPES = new Set([
  "KARTA_POBYTU","POBYT_CUKR","WIZA","WIZA_HUMANITARNA",
  "TRC_FDK","TRC_INNY_PRACODAWCA","TRC_STUDIA","TRC_POBYT_Z_CUDZ",
  "TRC_MALZONEK_PL","TRC_HUMANITARNE","TRC_ABSOLWENT","TRC_BLUE_CARD",
  "TRC_DZIALALNOSC","TRC_INNE_OKOLICZNOSCI",
  "POBYT_STALY","REZYDENT_UE","STATUS_UCHODZCY","OCHRONA_UZUPELNIAJACA",
  "ZGODA_HUMANITARNA","OBYWATEL_UE","UMOWA_WYSTAPIENIA",
  "RUCH_BEZWIZOWY","POBYT_NA_PRZEDLUZENIU","PESEL_UKR",
  "ZEZWOLENIE_A","ZEZWOLENIE_A_KONT",
  "OSWIADCZENIE",
  "POWIADOMIENIE_UA","ZGLOSZENIE_UA",
  "KARTA_POLAKA",
]);

const TRC_TYPES = new Set([
  "ZASWIADCZENIE_POSTEPOWANIE","ODWOLANIE",
  "OD_POBYT_STALY","OD_REZYDENT_UE","OD_MALZONEK_PL","OD_CZLONEK_RODZINY",
  "OD_BLUE_CARD","OD_HUMANITARNE","OD_OCHRONA_UZUP","OD_STUDENT",
  "OD_UE","OD_UK_WYSTAPIENIE","OD_UCHODZCA","OD_WIZA_HUMAN",
  "OD_ABSOLWENT","OD_KARTA_POLAKA",
  "STATUS_STUDENTA","STATUS_ABSOLWENTA",
]);

const WAZNE_FN = [
  /paszport/i, /passport/i, /паспорт/i,
  /decyzj[aiy]/i, /decision/i, /решение/i,
  /karta[\s_-]*pobytu/i, /residence[\s_-]*card/i,
  /zezwoleni[ea][\s_-]*na[\s_-]*prac/i, /work[\s_-]*permit/i,
  /wiza/i, /visa/i, /виза/i,
  /\bWP[\s_-]?\d{4}/i, /\bKP[\s_-]?skan/i,
];

const OSW_FN = [
  /WNIOSEK-OSW/i, /PSZ-OPPC|PSZ-OPWP|PSZ-ZOPP/i, /PSZ-PPPO|PSZ-PZPO|PGP-UZC/i,
  /podj[ęe]ci[ea].*(?:pracy|zatrudnieni)/i, /niepodj[ęe]ci[ea].*pracy/i,
  /zako[ńn]czeni[ea].*pracy/i, /zg[łl]oszeni[ea].*umowy/i,
  /op[łl]ata.*(?:o[śs]wiadczen|400\s*PLN|PUP)/i, /kopia.*umowy.*o[śs]w/i, /o[śs]w.*draft/i,
];

const ZEZW_FN = [
  /wniosek.*zezwoleni.*prac/i, /informacja.*starost/i, /WRP[-.\s]/i,
  /op[łl]ata.*(?:zezwoleni|WP)/i, /zawiadomieni[ea].*podj[ęe]ci/i,
];

const TRC_FN = [
  /odwo[łl]anie/i, /za[żz]alenie/i,
  /dyplom/i, /diploma/i, /диплом/i,
  /wniosek.*(?:pobyt|TRC|MOS|INPOL)/i, /za[łl][aą]cznik[\s_]*nr[\s_]*[12]/i,
  /stempel/i, /\bupo\b/i,
  /wezwani[ea].*(?:TRC|pobyt|MUW)/i, /zawiadomieni[ea]/i, /ponagleni[ea]/i,
  /przyspieszeni[ea].*TRC/i, /uzupe[łl]nieni[ea].*(?:TRC|MUW|dokumentacj)/i,
  /op[łl]ata.*(?:skarbow|440|100\s*PLN|pobyt|kart)/i,
  /pe[łl]nomocnictw[ao]|PoA[_\s]/i, /pismo.*przewodni/i,
  /OSW-UTRZYMANIE/i, /OSW-NIEKARALNOSC/i, /OSW-POBYT-3-LATA/i,
  /o[śs]wiadczeni[ea].*(?:utrzymani|niekaraln|pobyt.*3.*lat|liczb.*os[oó]b)/i,
  /umowa.*najm/i, /polisa|ubezpieczeni/i, /PIT[-_\s]?\d|ZUS(?:[\s_]|$)/i,
  /rachunek|rachunki/i, /umowa.*(?:dzieł|zleceni|prac|współprac)/i,
  /anex|aneks/i, /informacja.*starost/i, /odpowied[źz].*wezwani/i,
  /t[łl]umaczeni[ea]/i, /do[śs]wiadczeni[ea]/i,
  /potwierdzen.*(?:wys[łl]an|z[łl]o[żz]en|epuap|poczta|CEN\d)/i,
  /osobiste.*stawiennictwo/i, /niezalegani[ea]/i,
];

function classify(detectedType, isDiffPerson, filename, kategoria) {
  // Priority order matches src/lib/folder-classifier.ts exactly:
  // 1. Family member → dokumenty_rodziny
  if (isDiffPerson) return "dokumenty_rodziny";
  const fn = filename.toLowerCase();
  // 2. FILENAME procedure patterns FIRST (catches procedural docs even with final detectedType)
  if (OSW_FN.some(p => p.test(fn))) return "oswiadczenie";
  if (ZEZW_FN.some(p => p.test(fn))) return "zezwolenie";
  if (TRC_FN.some(p => p.test(fn))) return "trc";
  // 3. DetectedType → Ważne (only if filename didn't match procedure pattern)
  if (detectedType && WAZNE_TYPES.has(detectedType)) {
    if (kategoria && /^trc/i.test(kategoria)) return "trc";
    return "wazne";
  }
  // 3b. TRC procedure types
  if (detectedType && TRC_TYPES.has(detectedType)) return "trc";
  if (TRC_FN.some(p => p.test(fn))) return "trc";
  if (kategoria && /^trc/i.test(kategoria)) return "trc";
  // 4. Identity by filename → Ważne
  if (WAZNE_FN.some(p => p.test(fn))) return "wazne";
  // 5. Fallback
  return "inne_dokumenty";
}

// --- Main ---

async function main() {
  console.error(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}${CSV ? " (CSV)" : ""}`);

  const atts = await db.fdkAttachment.findMany({
    select: { id: true, foreignerId: true, nazwaPliku: true, kategoria: true, folder: true, folderManual: true, detectedType: true, opis: true },
    orderBy: [{ foreignerId: "asc" }, { id: "asc" }],
  });

  if (CSV) console.log("att_id,foreigner_id,plik,stara_kat,nowa_kat,powod");

  let changed = 0, skipped = 0, unchanged = 0;

  for (const a of atts) {
    if (a.folderManual) { skipped++; continue; }
    const isDiff = a.opis?.startsWith("\u26a0") && /inn(?:ej|a)\s+osob/i.test(a.opis);
    const newF = classify(a.detectedType, !!isDiff, a.nazwaPliku, a.kategoria);
    const oldF = a.folder ?? "inne_dokumenty";
    if (oldF === newF) { unchanged++; continue; }
    changed++;
    if (CSV) console.log(`${a.id},${a.foreignerId},"${a.nazwaPliku}",${oldF},${newF},"${a.detectedType || "filename"}"`);
    if (APPLY) await db.fdkAttachment.update({ where: { id: a.id }, data: { folder: newF } });
  }

  console.error(`\n--- Podsumowanie ---`);
  console.error(`Załączników: ${atts.length}`);
  console.error(`Zmienionych: ${changed}`);
  console.error(`Bez zmian: ${unchanged}`);
  console.error(`Pominięte (ręczne): ${skipped}`);
  if (!APPLY && changed > 0) console.error("Uruchom z --apply żeby zastosować.");
}

main().then(() => db.$disconnect()).catch(e => { console.error(e); db.$disconnect(); process.exit(1); });
