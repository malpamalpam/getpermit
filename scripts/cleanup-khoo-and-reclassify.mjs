/**
 * 1. Delete false Khoo NIEAKTYWNE TRC_FDK records (scraper artifacts from non-decision files)
 * 2. Re-run folder reclassification with updated rules
 *
 * Usage:
 *   node scripts/cleanup-khoo-and-reclassify.mjs            # dry-run
 *   node scripts/cleanup-khoo-and-reclassify.mjs --apply     # apply
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");

// --- Inlined classifier (updated rules: filename BEFORE detectedType) ---

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
const OSW_FN = [
  /WNIOSEK-OSW/i, /PSZ-OPPC|PSZ-OPWP|PSZ-ZOPP/i, /PSZ-PPPO|PSZ-PZPO|PGP-UZC/i,
  /podj[ęe]ci[ea].*(?:pracy|zatrudnieni)/i, /niepodj[ęe]ci[ea].*pracy/i,
  /zako[ńn]czeni[ea].*pracy/i, /zg[łl]oszeni[ea].*umowy/i,
  /op[łl]ata.*(?:o[śs]wiadczen|400\s*PLN|PUP)/i, /kopia.*umowy.*o[śs]w/i, /o[śs]w.*draft/i,
  // podjęcie / niepodjęcie standalone
  /podj[ęe]cie/i, /niepodj[ęe]cie/i,
  // wniosek oświadczenie
  /wniosek.*o[śs]w|wnisek.*o[śs]w/i,
  // oświadczenie wpisane (z nr PZC) already goes to wazne via detectedType, but
  // other oświadczenie docs (drafts, copies) should go to oswiadczenie
];
const ZEZW_FN = [
  /wniosek.*zezwoleni.*prac/i, /informacja.*starost/i, /WRP[-.\s]/i,
  /op[łl]ata.*(?:zezwoleni|WP)/i, /zawiadomieni[ea].*podj[ęe]ci/i,
  // UDD (zawiadomienie pracodawcy)
  /\bUDD\b/i,
  // Prośba o późniejsze rozpoczęcie / przedłużenie zezwolenia
  /pro[śs]ba.*(?:p[oó][źz]niejsz|przed[łl]u[żz]eni).*(?:prac|zezwoleni)/i,
  // WP draft
  /WP.?draft/i,
];
const TRC_FN = [
  /odwo[łl]anie/i, /za[żz]alenie/i,
  /dyplom/i, /diploma/i, /диплом/i,
  /wniosek.*(?:pobyt|TRC|MOS|INPOL)/i, /za[łl][aą]cznik[\s_]*nr[\s_]*[12]/i,
  /stempel/i, /\bupo\b/i,
  /wezwani[ea]/i, /zawiadomieni[ea]/i, /ponagleni[ea]/i,
  /przyspieszeni[ea]/i, /uzupe[łl]nieni[ea]/i,
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
  // zestaw dokumentów
  /zestaw/i,
  // świadectwo (szkolne, pracy)
  /[śs]wiadectw/i,
  // experience / doświadczenie
  /experience/i,
  // skan dokumentów do urzędu
  /skan.*dokument/i,
  // insurance
  /insurance/i,
  // spelling correction / sprostowanie
  /sprostowani/i,
  // KRS
  /\bKRS\b/i,
  // sprawozdanie finansowe
  /sprawozdani/i,
  // korekta załącznika
  /korekta/i,
  // invitation letter
  /invitation/i,
  // foundation registration
  /foundation.*regist|rejestr.*fundacj/i,
];
const WAZNE_FN = [
  /paszport/i, /passport/i, /паспорт/i,
  /decyzj[aiy]/i, /decision/i, /решение/i,
  /karta[\s_-]*pobytu/i, /residence[\s_-]*card/i,
  /zezwoleni[ea][\s_-]*na[\s_-]*prac/i, /work[\s_-]*permit/i,
  /wiza/i, /visa/i, /виза/i,
  /\bWP[\s_-]?\d{4}/i, /\bKP[\s_-]?skan/i,
  // Polish ID
  /Polish[\s_]*ID/i,
];

function classify(detectedType, isDiffPerson, filename, kategoria) {
  if (isDiffPerson) return "dokumenty_rodziny";
  const fn = filename.toLowerCase();
  // Filename-based procedure detection FIRST
  if (OSW_FN.some(p => p.test(fn))) return "oswiadczenie";
  if (ZEZW_FN.some(p => p.test(fn))) return "zezwolenie";
  if (TRC_FN.some(p => p.test(fn))) return "trc";
  // Then detectedType
  if (detectedType && WAZNE_TYPES.has(detectedType)) {
    if (kategoria && /^trc/i.test(kategoria)) return "trc";
    return "wazne";
  }
  if (detectedType && TRC_TYPES.has(detectedType)) return "trc";
  if (kategoria && /^trc/i.test(kategoria)) return "trc";
  if (WAZNE_FN.some(p => p.test(fn))) return "wazne";
  return "inne_dokumenty";
}

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  // === PART 1: Delete false Khoo NIEAKTYWNE records ===
  console.log("=== Khoo (#52) — usuwanie fałszywych NIEAKTYWNE ===\n");

  // IDs to delete: TRC_FDK without nr or with WRP sygnatura (not a TRC decision)
  const falseIds = [3515, 3517, 3519, 3522, 3534]; // from diagnostic
  for (const id of falseIds) {
    const b = await db.fdkEmploymentBase.findUnique({ where: { id }, select: { id: true, typ: true, nrDecyzji: true, status: true, foreignerId: true } });
    if (!b || b.foreignerId !== 52) { console.log(`  [SKIP] #${id} — nie znaleziono lub nie Khoo`); continue; }
    if (b.status !== "NIEAKTYWNE") { console.log(`  [SKIP] #${id} — status ${b.status}, nie NIEAKTYWNE`); continue; }
    console.log(`  [DELETE] #${id} ${b.typ} nr=${b.nrDecyzji||"-"}`);
    if (APPLY) {
      await db.fdkEmploymentBase.delete({ where: { id } });
      await db.fdkChangeLog.create({
        data: { foreignerId: 52, changedBy: "cleanup-khoo", field: "false_base_deleted", oldValue: `#${id} ${b.typ} nr=${b.nrDecyzji||"-"}`, newValue: "Fałszywy rekord usunięty (scraper artifact z non-decision file)" },
      });
    }
  }

  // === PART 2: Reclassify all folders ===
  console.log("\n=== Reklasyfikacja folderów (nowe reguły) ===\n");

  const atts = await db.fdkAttachment.findMany({
    select: { id: true, foreignerId: true, nazwaPliku: true, kategoria: true, folder: true, folderManual: true, detectedType: true, opis: true },
    orderBy: [{ foreignerId: "asc" }, { id: "asc" }],
  });

  let changed = 0, skipped = 0, unchanged = 0;
  for (const a of atts) {
    if (a.folderManual) { skipped++; continue; }
    const isDiff = a.opis?.startsWith("\u26a0") && /inn(?:ej|a)\s+osob/i.test(a.opis);
    const newF = classify(a.detectedType, !!isDiff, a.nazwaPliku, a.kategoria);
    const oldF = a.folder ?? "inne_dokumenty";
    if (oldF === newF) { unchanged++; continue; }
    changed++;
    if (APPLY) await db.fdkAttachment.update({ where: { id: a.id }, data: { folder: newF } });
  }

  console.log(`Załączników: ${atts.length}`);
  console.log(`Zmienionych: ${changed}`);
  console.log(`Bez zmian: ${unchanged}`);
  console.log(`Pominięte (ręczne): ${skipped}`);
  if (!APPLY && changed > 0) console.log("Uruchom z --apply żeby zastosować.");
}

main().then(() => db.$disconnect()).catch(e => { console.error(e); db.$disconnect(); process.exit(1); });
