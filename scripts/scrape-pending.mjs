/**
 * Selectively scrape pending attachments across the entire FDK database.
 * Skips passports, IDs, photos, RODO, ankiety, umowy.
 * Uses text extraction for PDFs with text layers (free), OCR only for scans of key docs.
 *
 * Usage:
 *   node scripts/scrape-pending.mjs                     # plan only (no scraping)
 *   node scripts/scrape-pending.mjs --run               # execute after reviewing plan
 *   node scripts/scrape-pending.mjs --run --resume       # resume from checkpoint
 *   node scripts/scrape-pending.mjs --run --report raport-scrape.csv
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

const db = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = "fdk-attachments";
const CHANGED_BY = "scrape-pending";
const CHECKPOINT_FILE = "scrape-checkpoint.json";

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");
const DO_RESUME = args.includes("--resume");
const reportIdx = args.indexOf("--report");
const REPORT_FILE = reportIdx >= 0 ? args[reportIdx + 1] : null;

// ==================== CLASSIFICATION RULES ====================

/** Files to SKIP — no OCR value */
const SKIP_PATTERNS = [
  /paszport/i, /passport/i,
  /dow[oó]d[\s_]*osobist/i,
  /zdj[eę]ci/i, /photo/i,
  /piecz[aą]tk/i,
  /ankiet/i,
  /rodo/i, /informacja[\s_]*dla[\s_]*osoby[\s_]*fizycznej/i,
  /polityka[\s_]*bezpiecze/i,
  /porozumienie[\s_]*o[\s_]*wsp[oó][lł]administr/i,
  /umowa/i, /umow[aey]/i,
  /za[lł][aą]cznik[\s_]*nr/i,
  /foundation[\s_]*registration/i,
  /kwestionariusz/i,
  /pe[lł]nomocnictw/i,
  /dyplom/i, /certific/i, /tefl/i,
  /legitymac/i,
  /rachun/i,
  /rozw[ią]za/i,
  /op[lł]at/i, /zap[lł]at/i,
  /polisa/i,
  /statut/i,
  /ksi[aą][zż]eczk/i,
  /ks\.?\s*pracy/i,
  /pesel/i,
  /karta[\s_]*polak/i,
  /wiza/i, /visa/i,
  /t[lł]umaczeni/i, /translat/i,
  /WoPC[\s-]*zal/i,
  /urzedowe[\s_]*poswiadczeni/i, /urz[eę]dowe[\s_]*po[sś]wiadczeni/i,
  /za[sś]wiadczeni/i,
  /korekta/i,
  /zestaw[\s_]*trc/i,
  /draft/i,
  /do[sś]wiadczeni/i,
];

/**
 * HARD SKIP — zawsze pomiń, nawet jeśli nazwa zawiera słowa kluczowe OCR.
 * Dokumenty procesowe, pisma, korespondencja — nie zawierają danych do scrapowania.
 */
const HARD_SKIP_PATTERNS = [
  /wnios[ek]/i,                         // wnioski
  /uzupe[lł]nienie|uzupelnienie/i,       // uzupełnienia do TRC itp.
  /wezwanie/i,                           // wezwania urzędowe
  /odpowied[źz]/i,                       // odpowiedzi
  /potwierdzeni/i,                       // potwierdzenia
  /confirmation/i,
  /\bUPO\b/i,                            // Urzędowe Poświadczenie Odbioru
  /po[sś]wiadczenie/i,
  /\bSKM_/i,                             // skany z SKM
  /pismo/i,                              // pisma
  /ponagleni/i,
  /rezerwacj/i,
  /zestaw[\s_]*dokument/i,               // zestawy dokumentów — nie sam dok.
  /korespondencj/i,
];

/** Files worth OCR — immigration/employment docs */
const OCR_WORTH_PATTERNS = [
  /decyzj/i,
  /o[sś]wiadczeni/i,
  /kart[aey][\s_]*pobytu/i,
  /\bKP[\s_]/i, /\bKP_/i,
  /\btrc\b/i,
  /zezwoleni/i,
  /blue[\s_]*card/i,
  /zg[lł]oszeni/i,
  /podjęci/i, /podjeci/i,
  /niepodjęci/i, /niepodjeci/i,
  /PSZ/i, /OPWP/i, /PZC/i,
  /pobyt/i,
  /proceedings/i,
];

/** Wiza/visa/karta polaka — skip for OCR (visual ID cards, no employment data) */
const SKIP_FOR_OCR = [
  /wiza/i, /visa/i,
  /karta[\s_]*polak/i,
  /legitymac/i,
];

function classifyFile(fileName, typPliku) {
  const name = fileName.toLowerCase();

  // Mac resource forks, temp files
  if (name.startsWith("._") || name.startsWith("~$")) return "skip";

  // HARD SKIP — always skip, even if OCR-worthy keyword also present
  for (const pat of HARD_SKIP_PATTERNS) {
    if (pat.test(fileName)) return "skip";
  }

  // Regular skip patterns — can be overridden if file is also OCR-worthy
  for (const pat of SKIP_PATTERNS) {
    if (pat.test(fileName)) {
      const isOcrWorthy = OCR_WORTH_PATTERNS.some((p) => p.test(fileName));
      const isSkipForOcr = SKIP_FOR_OCR.some((p) => p.test(fileName));

      // Key document name → OCR it despite matching a soft-skip pattern
      if (isOcrWorthy && !isSkipForOcr && !/rodo|informacja.*fizycznej|polityka.*bezpiecze|porozumienie.*administr/i.test(fileName)) {
        break; // fall through to OCR-worth check
      }
      return "skip";
    }
  }

  // OCR-worthy check
  const isOcrWorthy = OCR_WORTH_PATTERNS.some((p) => p.test(fileName));

  if (typPliku === "pdf") {
    // PDFs: always try text extraction first (free).
    // OCR-worthy PDFs fall back to OCR if text yields no document type.
    return isOcrWorthy ? "text_then_ocr" : "text_only";
  }

  if (["jpeg", "jpg", "png"].includes(typPliku)) {
    // Images: OCR if name matches key document, otherwise undecided.
    return isOcrWorthy ? "ocr" : "undecided";
  }

  return "skip"; // docx etc.
}

// ==================== NAME MATCHING (for different-person check) ====================

function normalizeNameTokens(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort();
}

function namesMatchTokens(extractedName, profileName) {
  const extracted = normalizeNameTokens(extractedName);
  const profile = normalizeNameTokens(profileName);
  if (extracted.length === 0 || profile.length === 0) return true;
  let matchCount = 0;
  for (const et of extracted) {
    for (const pt of profile) {
      if (et === pt || (et.length >= 3 && pt.length >= 3 && (et.startsWith(pt.substring(0, 3)) || pt.startsWith(et.substring(0, 3))))) {
        matchCount++; break;
      }
    }
  }
  return matchCount > 0;
}

// ==================== MAIN ====================

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  SCRAPE PENDING — selektywne scrapowanie`);
  console.log(`  Tryb: ${DO_RUN ? "WYKONANIE" : "PLAN (bez scrapowania)"}`);
  console.log(`${"=".repeat(60)}\n`);

  // Load checkpoint
  let checkpoint = new Set();
  if (DO_RESUME && fs.existsSync(CHECKPOINT_FILE)) {
    const data = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf-8"));
    checkpoint = new Set(data.processed || []);
    console.log(`Wznowienie — ${checkpoint.size} załączników już przetworzonych.\n`);
  }

  // Find already-scraped attachment IDs (from change logs)
  const scrapeLogs = await db.fdkChangeLog.findMany({
    where: { field: "scrape" },
    select: { newValue: true },
  });

  // Extract attachment filenames from scrape logs to detect already-scraped
  // Log format: "Utworzono/Zaktualizowano podstawe ... z pliku: FILENAME"
  // or "Rozpoznano odwolanie ... pliku: FILENAME"
  const scrapedFileNames = new Set();
  for (const log of scrapeLogs) {
    const match = log.newValue?.match(/pliku[: ]+(.+?)$/);
    if (match) scrapedFileNames.add(match[1].trim());
  }

  // Also check for "INNA OSOBA" logs
  const wrongPersonLogs = await db.fdkChangeLog.findMany({
    where: { field: "scrape", newValue: { contains: "INNA OSOB" } },
    select: { newValue: true },
  });
  for (const log of wrongPersonLogs) {
    const match = log.newValue?.match(/Scrape\s+(.+?):/);
    if (match) scrapedFileNames.add(match[1].trim());
  }

  // Also consider attachments with opis starting with ⚠ as already processed
  const flaggedAttachments = await db.fdkAttachment.findMany({
    where: { opis: { startsWith: "\u26a0" } },
    select: { id: true },
  });
  const flaggedIds = new Set(flaggedAttachments.map((a) => a.id));

  console.log(`Już zescrapowanych (z logów): ${scrapedFileNames.size}`);
  console.log(`Oflagowanych (inna osoba): ${flaggedIds.size}\n`);

  // Load all attachments in target categories
  const attachments = await db.fdkAttachment.findMany({
    where: {
      kategoria: { in: ["glowne", "trc"] },
      typPliku: { in: ["pdf", "jpeg", "jpg", "png"] },
    },
    include: {
      foreigner: { select: { id: true, imie: true, nazwisko: true } },
    },
    orderBy: [{ foreignerId: "asc" }, { id: "asc" }],
  });

  console.log(`Załączników w kategoriach glowne/trc: ${attachments.length}\n`);

  // Classify each
  const plan = {
    skip_already: [],
    skip_pattern: [],
    skip_flagged: [],
    text_only: [],
    text_then_ocr: [],
    ocr: [],
    undecided: [],
  };

  for (const att of attachments) {
    // Already scraped?
    if (scrapedFileNames.has(att.nazwaPliku) || checkpoint.has(att.id)) {
      plan.skip_already.push(att);
      continue;
    }
    // Already flagged as different person?
    if (flaggedIds.has(att.id)) {
      plan.skip_flagged.push(att);
      continue;
    }

    const classification = classifyFile(att.nazwaPliku, att.typPliku);
    switch (classification) {
      case "skip": plan.skip_pattern.push(att); break;
      case "text_only": plan.text_only.push(att); break;
      case "text_then_ocr": plan.text_then_ocr.push(att); break;
      case "ocr": plan.ocr.push(att); break;
      case "undecided": plan.undecided.push(att); break;
    }
  }

  // Print plan
  console.log(`${"=".repeat(60)}`);
  console.log(`  PLAN SCRAPOWANIA`);
  console.log(`${"=".repeat(60)}`);
  console.log(`  Pominięte (już zescrapowane):   ${plan.skip_already.length}`);
  console.log(`  Pominięte (wzorzec nazwy):      ${plan.skip_pattern.length}`);
  console.log(`  Pominięte (flaga inna osoba):   ${plan.skip_flagged.length}`);
  console.log(`  Tekstowe PDF (bez OCR):         ${plan.text_only.length}`);
  console.log(`  Tekstowe PDF + fallback OCR:    ${plan.text_then_ocr.length}`);
  console.log(`  Tylko OCR (skany/JPG):          ${plan.ocr.length}`);
  console.log(`  Do decyzji (nierozstrzygnięte): ${plan.undecided.length}`);

  // OCR cost estimate: text_then_ocr files might or might not need OCR
  // Estimate ~30% of text_then_ocr will need OCR fallback
  const estimatedOcrCalls = plan.ocr.length + Math.ceil(plan.text_then_ocr.length * 0.3);
  const costLow = estimatedOcrCalls * 0.03;
  const costHigh = estimatedOcrCalls * 0.08;
  console.log(`\n  SZACUNEK KOSZTU OCR:`);
  console.log(`    Max wywołań OCR: ${plan.ocr.length} (pewne) + ~${Math.ceil(plan.text_then_ocr.length * 0.3)} (fallback) = ~${estimatedOcrCalls}`);
  console.log(`    Szacunkowy koszt: $${costLow.toFixed(2)} — $${costHigh.toFixed(2)}`);

  // Show undecided files
  if (plan.undecided.length > 0) {
    console.log(`\n  PLIKI DO DECYZJI (${plan.undecided.length}):`);
    for (const att of plan.undecided) {
      console.log(`    - [${att.foreigner.imie} ${att.foreigner.nazwisko}] ${att.nazwaPliku} (${att.typPliku})`);
    }
  }

  // Show some skip examples
  if (plan.skip_pattern.length > 0) {
    console.log(`\n  Przykłady pominiętych (pierwsze 10):`);
    for (const att of plan.skip_pattern.slice(0, 10)) {
      console.log(`    - [${att.foreigner.imie} ${att.foreigner.nazwisko}] ${att.nazwaPliku}`);
    }
  }

  // Show OCR targets
  if (plan.ocr.length > 0) {
    console.log(`\n  Pliki do OCR (${plan.ocr.length}):`);
    for (const att of plan.ocr) {
      console.log(`    - [${att.foreigner.imie} ${att.foreigner.nazwisko}] ${att.nazwaPliku} (${att.typPliku})`);
    }
  }

  // Show text-then-ocr targets
  if (plan.text_then_ocr.length > 0) {
    console.log(`\n  PDF tekst+fallback OCR (${plan.text_then_ocr.length}):`);
    for (const att of plan.text_then_ocr.slice(0, 20)) {
      console.log(`    - [${att.foreigner.imie} ${att.foreigner.nazwisko}] ${att.nazwaPliku}`);
    }
    if (plan.text_then_ocr.length > 20) {
      console.log(`    ... i ${plan.text_then_ocr.length - 20} więcej`);
    }
  }

  if (!DO_RUN) {
    console.log(`\n  Uruchom z --run aby rozpocząć scrapowanie.\n`);
    await db.$disconnect();
    return;
  }

  // ==================== EXECUTION ====================

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ROZPOCZYNAM SCRAPOWANIE`);
  console.log(`${"=".repeat(60)}\n`);

  const report = [];
  const summary = { ok: 0, partial: 0, error: 0, skipped: 0, textOnly: 0, differentPerson: [] };

  // Helper: save checkpoint
  function saveCheckpoint(processedIds) {
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ processed: [...processedIds] }), "utf-8");
  }

  const processedIds = new Set(checkpoint);

  // 1. Process text-only PDFs (free — no OCR)
  console.log(`\n--- Tekstowe PDF (${plan.text_only.length}) ---\n`);
  for (const att of plan.text_only) {
    if (processedIds.has(att.id)) continue;
    const result = await processAttachment(att, "text_only");
    report.push(result);
    processedIds.add(att.id);
    saveCheckpoint(processedIds);
    if (result.scrapeResult === "ok") summary.ok++;
    else if (result.scrapeResult === "partial") summary.partial++;
    else if (result.scrapeResult === "text_no_data") summary.textOnly++;
    else if (result.scrapeResult === "different_person") summary.differentPerson.push(result);
    else summary.skipped++;
  }

  // 2. Process text+OCR PDFs
  console.log(`\n--- PDF tekst+fallback OCR (${plan.text_then_ocr.length}) ---\n`);
  for (const att of plan.text_then_ocr) {
    if (processedIds.has(att.id)) continue;
    const result = await processAttachment(att, "text_then_ocr");
    report.push(result);
    processedIds.add(att.id);
    saveCheckpoint(processedIds);
    if (result.scrapeResult === "ok") summary.ok++;
    else if (result.scrapeResult === "partial") summary.partial++;
    else if (result.scrapeResult === "error") summary.error++;
    else if (result.scrapeResult === "different_person") summary.differentPerson.push(result);
    else summary.skipped++;
  }

  // 3. Process OCR-only files
  console.log(`\n--- OCR skany/JPG (${plan.ocr.length}) ---\n`);
  for (const att of plan.ocr) {
    if (processedIds.has(att.id)) continue;
    const result = await processAttachment(att, "ocr");
    report.push(result);
    processedIds.add(att.id);
    saveCheckpoint(processedIds);
    if (result.scrapeResult === "ok") summary.ok++;
    else if (result.scrapeResult === "partial") summary.partial++;
    else if (result.scrapeResult === "error") summary.error++;
    else if (result.scrapeResult === "different_person") summary.differentPerson.push(result);
    else summary.skipped++;
  }

  // Add skipped/undecided to report
  for (const att of plan.skip_pattern) {
    report.push({
      osoba: `${att.foreigner.imie} ${att.foreigner.nazwisko}`,
      plik: att.nazwaPliku,
      decyzja: "pominiety_wzorzec",
      scrapeResult: "",
      typDokumentu: "",
      uwagi: "",
    });
  }
  for (const att of plan.undecided) {
    report.push({
      osoba: `${att.foreigner.imie} ${att.foreigner.nazwisko}`,
      plik: att.nazwaPliku,
      decyzja: "do_decyzji",
      scrapeResult: "",
      typDokumentu: "",
      uwagi: "Nazwa nie pasuje do żadnej reguły",
    });
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  PODSUMOWANIE`);
  console.log(`${"=".repeat(60)}`);
  console.log(`  OK:                ${summary.ok}`);
  console.log(`  Częściowe:         ${summary.partial}`);
  console.log(`  Błędy:             ${summary.error}`);
  console.log(`  Tekst bez danych:  ${summary.textOnly}`);
  console.log(`  Pominięte:         ${summary.skipped}`);

  if (summary.differentPerson.length > 0) {
    console.log(`\n  DOKUMENTY INNEJ OSOBY (${summary.differentPerson.length}):`);
    for (const r of summary.differentPerson) {
      console.log(`    - ${r.osoba}: ${r.plik} → ${r.uwagi}`);
    }
  }

  if (plan.undecided.length > 0) {
    console.log(`\n  DO DECYZJI (${plan.undecided.length}):`);
    for (const att of plan.undecided) {
      console.log(`    - [${att.foreigner.imie} ${att.foreigner.nazwisko}] ${att.nazwaPliku}`);
    }
  }

  // Write CSV report
  if (REPORT_FILE) {
    const csvLines = ["osoba;plik;decyzja;wynik;typ_dokumentu;uwagi"];
    for (const r of report) {
      csvLines.push(
        [r.osoba, r.plik, r.decyzja, r.scrapeResult, r.typDokumentu, r.uwagi]
          .map((v) => `"${(v || "").replace(/"/g, '""')}"`)
          .join(";")
      );
    }
    fs.writeFileSync(REPORT_FILE, csvLines.join("\n"), "utf-8");
    console.log(`\n  Raport zapisany: ${REPORT_FILE}`);
  }

  // Clean up checkpoint on success
  if (fs.existsSync(CHECKPOINT_FILE)) {
    fs.unlinkSync(CHECKPOINT_FILE);
    console.log(`  Checkpoint usunięty (pełny bieg zakończony).`);
  }

  console.log();
}

// ==================== JUNK VALUE DETECTION ====================

/**
 * Returns true if the value looks like a form label or multi-language concat,
 * not an actual data value worth storing.
 */
function isJunkFieldValue(value) {
  if (!value || typeof value !== "string") return false;
  const v = value.trim();
  if (v.length === 0) return true;
  // Ends with colon → label
  if (v.endsWith(":")) return true;
  // Contains classic form-label phrases
  if (/Imi[eę]\s*:|Nazwisko\s*:|rodzaj\s+pracy\s*:|podpis\s+osoby|Wnioskowana\s+liczba|i\s+podpis\s+osoby/i.test(v)) return true;
  // Multi-language junk: 2+ forward slashes AND over 40 chars → likely "field / champ / поле"
  const slashCount = (v.match(/\//g) ?? []).length;
  if (slashCount >= 2 && v.length > 40) return true;
  // Looks like a form field remnant: "/ rodzaj pracy:" pattern
  if (/^\s*\/\s*rodzaj\s+pracy/i.test(v)) return true;
  return false;
}

// ==================== PROCESS SINGLE ATTACHMENT ====================

async function processAttachment(att, mode) {
  const personName = `${att.foreigner.imie ?? ""} ${att.foreigner.nazwisko}`.trim();
  const result = {
    osoba: personName,
    plik: att.nazwaPliku,
    decyzja: mode,
    scrapeResult: "",
    typDokumentu: "",
    uwagi: "",
  };

  try {
    // Download from Supabase
    const { data: fileData, error: dlError } = await supabase.storage
      .from(BUCKET)
      .download(att.storagePath);

    if (dlError || !fileData) {
      result.scrapeResult = "error";
      result.uwagi = `Download failed: ${dlError?.message}`;
      console.log(`  [ERROR] ${att.nazwaPliku}: download failed`);
      return result;
    }

    const buffer = await fileData.arrayBuffer();
    let parsed = null;

    // Step 1: Try text extraction for PDFs
    if (att.typPliku === "pdf" && (mode === "text_only" || mode === "text_then_ocr")) {
      try {
        const pdfParse = (await import("pdf-parse")).default;
        const pdfData = await pdfParse(Buffer.from(buffer));
        const meaningfulLength = (pdfData.text ?? "").replace(/\s/g, "").length;

        if (meaningfulLength >= 200) {
          parsed = parseTextBasic(pdfData.text, att.nazwaPliku);
          if (parsed && parsed.detectedType) {
            console.log(`  [TEXT] ${att.nazwaPliku} → ${parsed.detectedType}`);
          } else if (mode === "text_only") {
            result.scrapeResult = "text_no_data";
            result.uwagi = `Tekst (${meaningfulLength} zn.) — brak rozpoznanego typu dokumentu`;
            console.log(`  [TEXT-NODATA] ${att.nazwaPliku} (${meaningfulLength} chars — no doc type)`);
            return result;
          }
          // If text_then_ocr and no good result, fall through to OCR
        } else if (mode === "text_only") {
          result.scrapeResult = "text_no_data";
          result.uwagi = `Za mało tekstu (${meaningfulLength} zn.)`;
          console.log(`  [TEXT-SHORT] ${att.nazwaPliku} (${meaningfulLength} chars)`);
          return result;
        }
        // text_then_ocr with no text → fall through to OCR
      } catch (e) {
        if (mode === "text_only") {
          result.scrapeResult = "error";
          result.uwagi = `PDF parse error: ${e.message}`;
          return result;
        }
        // Fall through to OCR
      }
    }

    // Step 2: OCR if needed
    if (!parsed || !parsed.detectedType) {
      if (mode === "text_only") {
        result.scrapeResult = "text_no_data";
        return result;
      }

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        result.scrapeResult = "error";
        result.uwagi = "Brak ANTHROPIC_API_KEY";
        return result;
      }

      const isPdf = att.typPliku === "pdf";
      const isImage = ["jpeg", "jpg", "png"].includes(att.typPliku);

      parsed = await ocrExtract(buffer, isImage, isPdf, att.nazwaPliku, apiKey, att.typPliku);
      if (!parsed) {
        result.scrapeResult = "error";
        result.uwagi = "OCR nie zwrócił danych";
        console.log(`  [OCR-FAIL] ${att.nazwaPliku}`);

        // Retry once
        console.log(`  [RETRY] ${att.nazwaPliku}`);
        parsed = await ocrExtract(buffer, isImage, isPdf, att.nazwaPliku, apiKey, att.typPliku);
        if (!parsed) {
          console.log(`  [RETRY-FAIL] ${att.nazwaPliku}`);
          return result;
        }
      }
      console.log(`  [OCR] ${att.nazwaPliku} → ${parsed.detectedType || "?"}`);
    }

    result.typDokumentu = parsed.detectedType || "";

    // Step 3: Name match check
    const extractedFullName = `${parsed.imie ?? ""} ${parsed.nazwisko ?? ""}`.trim();
    if (extractedFullName.length > 2 && personName.length > 2 && att.foreigner.nazwisko !== "Nowy") {
      if (!namesMatchTokens(extractedFullName, personName)) {
        // Different person!
        await db.fdkAttachment.update({
          where: { id: att.id },
          data: { opis: `\u26a0 Dokument innej osoby: ${extractedFullName}` },
        });
        await db.fdkChangeLog.create({
          data: {
            foreignerId: att.foreignerId,
            changedBy: CHANGED_BY,
            field: "scrape",
            oldValue: null,
            newValue: `Scrape ${att.nazwaPliku}: INNA OSOBA (${extractedFullName}) — podstawa NIE utworzona. Profil: ${personName}.`,
          },
        });
        result.scrapeResult = "different_person";
        result.uwagi = `Inna osoba: ${extractedFullName}`;
        console.log(`  [INNA OSOBA] ${att.nazwaPliku}: ${extractedFullName} ≠ ${personName}`);
        return result;
      }
    }

    // Step 4: Apply to profile
    const foreigner = await db.fdkForeigner.findUnique({ where: { id: att.foreignerId } });
    if (!foreigner) {
      result.scrapeResult = "error";
      result.uwagi = "Foreigner not found";
      return result;
    }

    // Auto-fill empty fields
    const updateData = {};
    if (parsed.imie && !foreigner.imie) updateData.imie = parsed.imie;
    if (parsed.nazwisko && foreigner.nazwisko === "Nowy") updateData.nazwisko = parsed.nazwisko;
    if (parsed.dataUrodzenia && !foreigner.dataUrodzenia) updateData.dataUrodzenia = new Date(parsed.dataUrodzenia);
    if (parsed.obywatelstwo && !foreigner.obywatelstwo) updateData.obywatelstwo = parsed.obywatelstwo;
    if (parsed.nrPaszportu && !foreigner.nrPaszportu) updateData.nrPaszportu = parsed.nrPaszportu;

    if (Object.keys(updateData).length > 0) {
      await db.fdkForeigner.update({ where: { id: att.foreignerId }, data: updateData });
      for (const [key, value] of Object.entries(updateData)) {
        await db.fdkChangeLog.create({
          data: {
            foreignerId: att.foreignerId,
            changedBy: CHANGED_BY,
            field: key,
            oldValue: null,
            newValue: value instanceof Date ? value.toISOString().slice(0, 10) : String(value),
          },
        });
      }
    }

    // ---- Walidacja numerów: muszą zawierać co najmniej jedną cyfrę ----
    if (parsed.nrOswiadczenia && !/\d/.test(parsed.nrOswiadczenia)) {
      console.log(`  [JUNK-NR] nrOswiadczenia="${parsed.nrOswiadczenia}" — brak cyfry, odrzucono`);
      parsed.nrOswiadczenia = null;
    }
    if (parsed.nrDecyzji && !/\d/.test(parsed.nrDecyzji)) {
      console.log(`  [JUNK-NR] nrDecyzji="${parsed.nrDecyzji}" — brak cyfry, odrzucono`);
      parsed.nrDecyzji = null;
    }

    // ---- Walidacja: odrzucaj wartości wyglądające jak etykiety formularza ----
    if (parsed.stanowisko && isJunkFieldValue(parsed.stanowisko)) {
      console.log(`  [JUNK-STANOWISKO] "${parsed.stanowisko.substring(0, 60)}..." → odrzucono`);
      parsed.stanowisko = null;
    }
    if (parsed.firma && isJunkFieldValue(parsed.firma)) {
      console.log(`  [JUNK-FIRMA] "${parsed.firma.substring(0, 60)}..." → odrzucono`);
      parsed.firma = null;
    }
    if (parsed.rodzajUmowy && isJunkFieldValue(parsed.rodzajUmowy)) {
      parsed.rodzajUmowy = null;
    }

    // Guard: nie twórz podstawy jeśli brak dat, numeru i żadnych sensownych danych
    const hasUsefulData = parsed.dataOd || parsed.dataDo || parsed.nrDecyzji || parsed.nrOswiadczenia;
    if (!hasUsefulData) {
      await db.fdkChangeLog.create({
        data: {
          foreignerId: att.foreignerId,
          changedBy: CHANGED_BY,
          field: "scrape",
          oldValue: null,
          newValue: `Scrape ${att.nazwaPliku}: nieczytelny/formularz — brak dat i numeru dokumentu. Podstawa NIE utworzona.`,
        },
      });
      result.scrapeResult = "nieczytelny_formularz";
      result.uwagi = "Brak dat i numeru — formularz lub nieczytelny skan";
      console.log(`  [FORMULARZ] ${att.nazwaPliku} — brak dat i numeru, pomijam tworzenie podstawy`);
      return result;
    }
    // -------------------------------------------------------------------------

    // Skip ODWOLANIE
    if (parsed.detectedType === "ODWOLANIE") {
      await db.fdkChangeLog.create({
        data: {
          foreignerId: att.foreignerId,
          changedBy: CHANGED_BY,
          field: "scrape",
          oldValue: null,
          newValue: `Rozpoznano odwołanie w pliku: ${att.nazwaPliku}. Podstawa NIE utworzona.`,
        },
      });
      result.scrapeResult = "ok";
      return result;
    }

    // Step 5: Create/update employment base
    if (!parsed.detectedType) {
      // Nie twórz podstawy jeśli typ dokumentu nierozpoznany — fallback na OSWIADCZENIE
      // powodował fałszywe wpisy.
      await db.fdkChangeLog.create({
        data: {
          foreignerId: att.foreignerId,
          changedBy: CHANGED_BY,
          field: "scrape",
          oldValue: null,
          newValue: `Scrape ${att.nazwaPliku}: nierozpoznany typ dokumentu — podstawa NIE utworzona.`,
        },
      });
      result.scrapeResult = "nierozpoznany_typ";
      result.uwagi = "Nierozpoznany typ dokumentu — podstawa nie utworzona";
      console.log(`  [UNKNOWN-TYPE] ${att.nazwaPliku} — pomijam tworzenie podstawy`);
      return result;
    }
    const docType = parsed.detectedType;

    // WIZA — save to wizaDo on foreigner profile, don't create employment base
    if (docType === "WIZA" && parsed.dataDo) {
      if (!foreigner.wizaDo || new Date(parsed.dataDo) > foreigner.wizaDo) {
        await db.fdkForeigner.update({
          where: { id: att.foreignerId },
          data: { wizaDo: new Date(parsed.dataDo) },
        });
      }
      await db.fdkChangeLog.create({
        data: {
          foreignerId: att.foreignerId,
          changedBy: CHANGED_BY,
          field: "scrape",
          oldValue: null,
          newValue: `Rozpoznano wizę w pliku: ${att.nazwaPliku}. wizaDo=${parsed.dataDo}.`,
        },
      });
      result.scrapeResult = "ok";
      result.typDokumentu = "WIZA";
      console.log(`  [WIZA] ${att.nazwaPliku} → wizaDo=${parsed.dataDo}`);
      return result;
    }

    let existingBase = null;
    if (docType === "OSWIADCZENIE" && parsed.nrOswiadczenia) {
      existingBase = await db.fdkEmploymentBase.findFirst({
        where: { foreignerId: att.foreignerId, typ: docType, nrOswiadczenia: parsed.nrOswiadczenia },
      });
    } else if (docType !== "OSWIADCZENIE" && parsed.nrDecyzji) {
      existingBase = await db.fdkEmploymentBase.findFirst({
        where: { foreignerId: att.foreignerId, typ: docType, nrDecyzji: parsed.nrDecyzji },
      });
    }
    if (!existingBase && parsed.dataOd && parsed.dataDo) {
      existingBase = await db.fdkEmploymentBase.findFirst({
        where: {
          foreignerId: att.foreignerId,
          typ: docType,
          dataOd: new Date(parsed.dataOd),
          dataDo: new Date(parsed.dataDo),
        },
      });
    }

    const baseData = {
      foreignerId: att.foreignerId,
      typ: docType,
      status: "BRAK_DANYCH",
      dataOd: parsed.dataOd ? new Date(parsed.dataOd) : null,
      dataDo: parsed.dataDo ? new Date(parsed.dataDo) : null,
      rodzajUmowy: parsed.rodzajUmowy || null,
      stanowisko: parsed.stanowisko || null,
      firma: parsed.firma || null,
    };

    if (docType === "OSWIADCZENIE") {
      baseData.nrOswiadczenia = parsed.nrOswiadczenia || null;
      baseData.nrDecyzji = null;
    } else {
      baseData.nrDecyzji = parsed.nrDecyzji || null;
      baseData.nrOswiadczenia = null;
    }
    // wynagrodzenie stored as stawka (Decimal) — extract number
    if (parsed.wynagrodzenie) {
      const numMatch = parsed.wynagrodzenie.match(/([0-9]+[.,]?\d*)/);
      if (numMatch) {
        baseData.stawka = parseFloat(numMatch[1].replace(",", "."));
      }
    }

    let baseId;
    if (existingBase) {
      const updateFields = {};
      for (const [key, value] of Object.entries(baseData)) {
        if (key === "foreignerId") continue;
        if (value !== null && value !== undefined) updateFields[key] = value;
      }
      await db.fdkEmploymentBase.update({ where: { id: existingBase.id }, data: updateFields });
      baseId = existingBase.id;
    } else {
      const base = await db.fdkEmploymentBase.create({ data: baseData });
      baseId = base.id;
    }

    await db.fdkChangeLog.create({
      data: {
        foreignerId: att.foreignerId,
        changedBy: CHANGED_BY,
        field: "scrape",
        oldValue: null,
        newValue: `${existingBase ? "Zaktualizowano" : "Utworzono"} podstawę #${baseId} (${docType}) z pliku: ${att.nazwaPliku}`,
      },
    });

    // Handle residence permits
    if ((docType === "KARTA_POBYTU" || docType === "BLUE_CARD") && parsed.dataDo) {
      const dataDo = new Date(parsed.dataDo);
      if (!foreigner.decyzjaPobytowaDo || dataDo > foreigner.decyzjaPobytowaDo) {
        await db.fdkForeigner.update({
          where: { id: att.foreignerId },
          data: { decyzjaPobytowaDo: dataDo },
        });
      }
    }

    const partial = !parsed.dataOd || !parsed.dataDo || !parsed.detectedType;
    result.scrapeResult = partial ? "partial" : "ok";
    return result;

  } catch (err) {
    // Re-throw auth errors to abort the entire run
    if (err.message?.includes("ANTHROPIC_API_KEY")) throw err;
    result.scrapeResult = "error";
    result.uwagi = err.message;
    console.error(`  [ERROR] ${att.nazwaPliku}: ${err.message}`);
    return result;
  }
}

// ==================== BASIC TEXT PARSING ====================

function parseTextBasic(text, filename) {
  const result = {};

  // Detect type — use only sentencja (before UZASADNIENIE) to avoid false matches
  // from citations in the reasoning section of decisions.
  const sentencja = text.split(/UZASADNIENIE/i)[0];

  if (/odwo[łl]anie\s+od\s+decyzji|za[żz]alenie|procedura\s+odwo[łl]awcz/i.test(sentencja)) {
    result.detectedType = "ODWOLANIE";
  } else if (/PSZ[\s-]*OPWP|o[śs]wiadczenie\s+podmiotu\s+.*powierzeni/i.test(sentencja)) {
    result.detectedType = "OSWIADCZENIE";
  } else if (/powiadomi\w*\s+o\s+powierzeni|zg[lł]oszeni\w*\s+(?:o\s+)?powierzeni|powiadomienie\s+PUP/i.test(sentencja)) {
    result.detectedType = "ZGLOSZENIE_UA";
  } else if (/niebieska\s+karta|blue\s+card|wysoki(?:ch|e)\s+kwalifikacj|art\.?\s*127/i.test(sentencja)) {
    result.detectedType = "BLUE_CARD";
  } else if (/kart[aęy]\s+pobytu|zezwoleni[eao]\s+na\s+pobyt\s+czasow/i.test(sentencja)) {
    result.detectedType = "KARTA_POBYTU";
  } else if (/wiz[aęy]\s+(?:krajow|schengeno|typu|nr)|decyzj\w+\s+wizow/i.test(sentencja)) {
    result.detectedType = "WIZA";
  } else if (/zezwoleni[eao]\s+na\s+prac[ęe]/i.test(sentencja)) {
    result.detectedType = "ZEZWOLENIE";
  }

  // Nr oswiadczenia — from sentencja only
  const nrOswMatch = sentencja.match(/(?:PZC|OP\.G)[.\s]*\d{4}[.\s]*\d+[.\s]*\w*[.\s]*\d{4}/);
  if (nrOswMatch) result.nrOswiadczenia = nrOswMatch[0].trim();

  // Nr decyzji — from sentencja only, match DL.WIPO / DL.WIIPO / DL.WIIPO variants
  const nrDecMatch = sentencja.match(/(?:DL\.WII?PO|DL\.WIIPO)[.\s]*\d{4}[.\s]*\d+[.\s/]*[\w]*/);
  if (nrDecMatch) {
    result.nrDecyzji = nrDecMatch[0].trim();
  } else {
    // Fallback: WSC numer, but only from sentencja (not uzasadnienie)
    const wscMatch = sentencja.match(/WSC[\w-]*[.\s]*\d{4}[.\s]*\d+[.\s]*\d{4}/);
    if (wscMatch) result.nrDecyzji = wscMatch[0].trim();
  }

  // Extract dates — from sentencja only (avoid dates from uzasadnienie)
  const datePattern = /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/g;
  const dates = [];
  let m;
  while ((m = datePattern.exec(sentencja)) !== null) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const y = parseInt(m[3], 10);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 1980 && y <= 2040) {
      dates.push(`${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
  }
  if (dates.length >= 2) {
    dates.sort();
    result.dataOd = dates[0];
    result.dataDo = dates[dates.length - 1];
  } else if (dates.length === 1) {
    result.dataOd = dates[0];
  }

  // Extract name — from sentencja only; skip country-like words (Federacji, Rosyjskiej, etc.)
  const COUNTRY_WORDS = /^(?:Federacji|Rosyjskiej|Ukrainy|Indii|Turcji|Gruzji|Armenii|Mołdawii|Białorusi|Uzbekistanu|Kazachstanu|Republiki|Ludowej|Socjalistycznej)$/;
  const nameMatch = sentencja.match(/(?:cudzoziemcowi|cudzoziemca|obywatel(?:owi|a)?)\s*(?:[-–:]\s*)?([A-ZŻŹĆĄŚĘŁÓŃ][a-ząćęłńóśźż]+)\s+([A-ZŻŹĆĄŚĘŁÓŃ][a-ząćęłńóśźż]+)/);
  if (nameMatch) {
    const w1 = nameMatch[1].trim();
    const w2 = nameMatch[2].trim();
    if (!COUNTRY_WORDS.test(w1) && !COUNTRY_WORDS.test(w2)) {
      result.imie = w1;
      result.nazwisko = w2;
    }
  }

  // Wynagrodzenie — from sentencja only
  const wynMatch = sentencja.match(/(?:wynagrodzeni\w+|stawk\w+)\s+(?:nie\s+ni[zż]sz\w+\s+ni[zż]\s+)?(\d[\d\s,.]+)\s*(?:z[lł]|PLN)/i);
  if (wynMatch) {
    result.wynagrodzenie = wynMatch[1].replace(/\s/g, "").trim() + " PLN brutto";
  }

  // Stanowisko — from sentencja only
  const stanMatch = sentencja.match(/stanowisk\w+[:\s]+([^\n,]+)/i);
  if (stanMatch) result.stanowisko = stanMatch[1].trim();

  // Firma — from sentencja only
  const firmaMatch = sentencja.match(/(?:na rzecz|podmiot\w*)[:\s]+([^\n]+?)(?:\s*,\s*(?:ul|NIP|KRS|REGON))/i);
  if (firmaMatch) result.firma = firmaMatch[1].trim();

  // Obywatelstwo — from sentencja only
  const obywMatch = sentencja.match(/obywatelstw\w+[:\s]+([A-ZŻŹĆĄŚĘŁÓŃa-ząćęłńóśźż]+)/i);
  if (obywMatch) {
    let cit = obywMatch[1].trim();
    if (cit.length > 2) result.obywatelstwo = cit;
  }

  return result;
}

// ==================== OCR VIA ANTHROPIC SDK ====================

async function ocrExtract(buffer, isImage, isPdf, filename, apiKey, typPliku) {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey });

  const fileSizeMB = buffer.byteLength / 1024 / 1024;
  if (buffer.byteLength > 25 * 1024 * 1024) {
    console.log(`    [OCR] Za duży: ${fileSizeMB.toFixed(1)} MB`);
    return null;
  }

  const base64 = Buffer.from(buffer).toString("base64");
  const useHaiku = !isPdf && buffer.byteLength > 2 * 1024 * 1024;
  const model = useHaiku ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-6";

  const extractionPrompt = `Ten obraz/plik to strona polskiego dokumentu imigracyjnego. Obraz moze byc OBROCONY.

ZADANIE: Wyciagnij dane i zwroc TYLKO JSON:

{"detectedType":"...","imie":"...","nazwisko":"...","dataUrodzenia":"YYYY-MM-DD","obywatelstwo":"kraj","nrPaszportu":"...","dataOd":"YYYY-MM-DD","dataDo":"YYYY-MM-DD","stanowisko":"...","rodzajUmowy":"...","firma":"...","nrDecyzji":"...","nrOswiadczenia":"...","wynagrodzenie":"...","wymiarCzasu":"..."}

ZASADY:
1. Dokument: NAGLOWEK → SENTENCJA → UZASADNIENIE. Dane bierz WYŁĄCZNIE z SENTENCJI (po "postanawiam"/"orzekam"/"udzielam"). NIGDY z UZASADNIENIA.
2. DECYZJA II INSTANCJI (Szef Urzędu do Spraw Cudzoziemców, "uchylam i udzielam"):
   - nrDecyzji = sygnatura z NAGLOWKA tej decyzji (np. DL.WIIPO.xxxx), NIE numer uchylonej decyzji (np. WSC-...).
   - Wszystkie dane (daty, wynagrodzenie, stanowisko, firma) TYLKO z części po "udzielam zezwolenia" w SENTENCJI.
   - dataDo = data "do dnia" z sentencji udzielenia.
   - dataOd = data wydania decyzji z nagłówka.
   - IGNORUJ wszystkie numery, daty i kwoty wymienione w uzasadnieniu lub w części "uchylam".
3. dataOd = data wydania z naglowka. dataDo = "do dnia" z sentencji.
4. wynagrodzenie = TYLKO z sentencji ("za wynagrodzeniem nie nizszym niz X zl brutto").
5. firma = PELNA nazwa z sentencji ("na rzecz podmiotu NAZWA").
6. nrDecyzji = sygnatura z naglowka (pod nazwa organu).
7. detectedType:
   - "wysokie kwalifikacje"/art.127 W SENTENCJI → BLUE_CARD
   - "udzielam zezwolenia na pobyt" → KARTA_POBYTU
   - "zezwolenie na prace" → ZEZWOLENIE
   - formularz PSZ-OPWP → OSWIADCZENIE
   - "powiadomienie o powierzeniu pracy" / "zgloszenie o powierzeniu pracy" (UA) → ZGLOSZENIE_UA (nie maja dataDo = null)
8. obywatelstwo: TYLKO kraj (NIE "Federacji Rosyjskiej" — pisz "Rosja").
9. stanowisko: z sentencji ("na stanowisku" lub "rodzaj pracy").
10. wymiarCzasu: np. "100 godzin miesięcznie", "pełny etat" — z sentencji.
11. rodzajUmowy: np. "umowa o dzieło", "umowa zlecenie" — z sentencji.
12. OSWIADCZENIE: nrOswiadczenia = PZC/OP.G numer.
13. Pola nieznalezione = null.`;

  // Determine correct media type from actual file extension
  const mediaType = typPliku === "png" ? "image/png" : "image/jpeg";

  try {
    const contentBlock = isPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };

    let response;
    if (isPdf) {
      response = await client.beta.messages.create({
        model,
        max_tokens: 2048,
        betas: ["pdfs-2024-09-25"],
        messages: [{ role: "user", content: [contentBlock, { type: "text", text: extractionPrompt }] }],
      });
    } else {
      response = await client.messages.create({
        model,
        max_tokens: 2048,
        messages: [{ role: "user", content: [contentBlock, { type: "text", text: extractionPrompt }] }],
      });
    }

    const fullText = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n").trim();

    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);
    const result = {};

    if (data.detectedType && ["OSWIADCZENIE", "ZEZWOLENIE", "KARTA_POBYTU", "BLUE_CARD", "ODWOLANIE", "ZGLOSZENIE_UA", "WIZA"].includes(data.detectedType)) {
      result.detectedType = data.detectedType;
    }
    if (data.imie && typeof data.imie === "string") result.imie = data.imie.trim();
    if (data.nazwisko && typeof data.nazwisko === "string") result.nazwisko = data.nazwisko.trim();
    if (data.dataUrodzenia && /^\d{4}-\d{2}-\d{2}$/.test(data.dataUrodzenia)) result.dataUrodzenia = data.dataUrodzenia;
    if (data.obywatelstwo && typeof data.obywatelstwo === "string") {
      let cit = data.obywatelstwo.trim().replace(/\s+(zezwolenie|pobyt|prac|decyzj|czasow|kart|na|do|dnia|terytorium).*$/i, "").trim();
      if (cit.length > 1) result.obywatelstwo = cit;
    }
    if (data.nrPaszportu && typeof data.nrPaszportu === "string") result.nrPaszportu = data.nrPaszportu.trim();
    if (data.dataOd && /^\d{4}-\d{2}-\d{2}$/.test(data.dataOd)) result.dataOd = data.dataOd;
    if (data.dataDo && /^\d{4}-\d{2}-\d{2}$/.test(data.dataDo)) result.dataDo = data.dataDo;
    if (data.stanowisko && typeof data.stanowisko === "string") result.stanowisko = data.stanowisko.trim();
    if (data.rodzajUmowy && typeof data.rodzajUmowy === "string") result.rodzajUmowy = data.rodzajUmowy.trim();
    if (data.firma && typeof data.firma === "string") result.firma = data.firma.trim();
    if (data.nrDecyzji && typeof data.nrDecyzji === "string") result.nrDecyzji = data.nrDecyzji.trim();
    if (data.nrOswiadczenia && typeof data.nrOswiadczenia === "string") result.nrOswiadczenia = data.nrOswiadczenia.trim();
    if (data.wynagrodzenie && typeof data.wynagrodzenie === "string") {
      let wyn = data.wynagrodzenie.trim().replace(/\s+\d+\.\s*$/, "").replace(/\.\s*$/, "").trim();
      if (wyn.length > 2) result.wynagrodzenie = wyn;
    }

    const hasAnyData = result.dataOd || result.dataDo || result.nazwisko || result.imie
      || result.stanowisko || result.nrPaszportu || result.nrDecyzji || result.wynagrodzenie;

    return hasAnyData ? result : null;

  } catch (err) {
    console.error(`    [OCR ERROR] ${filename}: ${err.message}`);
    // Abort immediately on auth errors — no point retrying
    if (err.message?.includes("401") || err.message?.includes("authentication_error") || err.message?.includes("API key")) {
      throw new Error(`ANTHROPIC_API_KEY nieważny — przerwij i napraw klucz. ${err.message}`);
    }
    return null;
  }
}

// ==================== RUN ====================

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    db.$disconnect();
    process.exit(1);
  });
