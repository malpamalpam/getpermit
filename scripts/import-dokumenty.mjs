/**
 * Import dokumentow cudzoziemcow z dysku do getpermit.pl
 *
 * Usage:
 *   node scripts/import-dokumenty.mjs <sciezka-do-folderu> [--dry-run] [--scrape] [--only <folder1,folder2,...>] [--concurrency <N>] [--report <plik.csv>]
 *
 * Przyklady:
 *   node scripts/import-dokumenty.mjs "C:\Users\gstep\Desktop\Cudzoziemcy A" --dry-run
 *   node scripts/import-dokumenty.mjs "C:\Users\gstep\Desktop\Cudzoziemcy A" --dry-run --only "Abrazhevich_Kirill,Abbas_Anas,Aleksandra Mosina"
 *   node scripts/import-dokumenty.mjs "C:\Users\gstep\Desktop\Cudzoziemcy A" --scrape --report raport-import-A.csv
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

const db = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = "fdk-attachments";
const CHANGED_BY = "import-dokumenty";

// ==================== CLI ARGS ====================

const args = process.argv.slice(2);
const sourceDir = args.find((a) => !a.startsWith("--"));
if (!sourceDir) {
  console.error("Uzycie: node scripts/import-dokumenty.mjs <sciezka-do-folderu> [--dry-run] [--scrape] [--only <folders>] [--report <plik.csv>]");
  process.exit(1);
}

const DRY_RUN = args.includes("--dry-run");
const DO_SCRAPE = args.includes("--scrape");
const onlyIdx = args.indexOf("--only");
const ONLY_FOLDERS = onlyIdx >= 0 ? args[onlyIdx + 1].split(",").map((s) => s.trim()) : null;
const reportIdx = args.indexOf("--report");
const REPORT_FILE = reportIdx >= 0 ? args[reportIdx + 1] : null;
const concIdx = args.indexOf("--concurrency");
const SCRAPE_CONCURRENCY = concIdx >= 0 ? parseInt(args[concIdx + 1], 10) : 2;
const batchIdx = args.indexOf("--batch");
const BATCH_NAME = batchIdx >= 0 ? args[batchIdx + 1] : "A";

// ==================== FILE CLASSIFICATION ====================

const IMPORTABLE_EXTS = new Set(["pdf", "jpg", "jpeg", "png", "heic"]);
const SKIP_FILES = new Set(["thumbs.db"]);
const SKIP_EXTS = new Set(["rtf", "xml", "txt", "db"]);
const ARCHIVE_EXTS = new Set(["zip", "rar", "7z"]);
const DOCX_EXT = "docx";

/**
 * Determine kategoria from subfolder path relative to person dir.
 */
function getKategoria(relPath) {
  const lower = relPath.toLowerCase();
  // TRC folders
  if (/\btrc\b/i.test(lower)) return "trc";
  // Wspolpraca/umowy + DOCX → inne (no scraping)
  if (/wsp[oó][lł]prac|umow|rodo|paczka/i.test(lower)) return "inne";
  return "glowne";
}

/**
 * Override: DOCX always → "inne"
 */
function getKategoriaForFile(relPath, ext) {
  if (ext === DOCX_EXT) return "inne";
  return getKategoria(relPath);
}

// ==================== NAME NORMALIZATION ====================

/**
 * Normalize a name for matching: lowercase, strip diacritics, split into sorted tokens.
 */
function normalizeNameTokens(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[_\-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort();
}

function nameKey(tokens) {
  return tokens.join("|");
}

/**
 * Parse person folder name → {imie, nazwisko} guess.
 * Formats:
 *   Nazwisko_Imie          → last=Nazwisko, first=Imie
 *   Nazwisko_Imie1_Imie2   → last=Nazwisko, first=Imie1 Imie2
 *   "Imie Nazwisko"        → first=Imie, last=Nazwisko (space-separated)
 *   Wielotokenowe z _ mogą być: Abraham_Daniel_Dominic (last=Abraham, first=Daniel Dominic)
 *
 * Heurystyka: format z _ → pierwszy token=nazwisko, reszta=imiona
 *             format ze spacją → pierwszy token=imie, ostatni=nazwisko
 */
function parseFolderName(folderName) {
  if (folderName.includes("_")) {
    const parts = folderName.split("_").filter(Boolean);
    return {
      nazwisko: parts[0],
      imie: parts.slice(1).join(" ") || null,
    };
  }
  // Space-separated: "Imie Nazwisko" or "Imie1 Imie2 Nazwisko"
  const parts = folderName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { nazwisko: parts[0], imie: null };
  }
  return {
    imie: parts.slice(0, -1).join(" "),
    nazwisko: parts[parts.length - 1],
  };
}

// ==================== FILE WALKING ====================

function walkDir(dir) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function displayName(fileName) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTypPliku(ext) {
  if (ext === "jpg") return "jpeg";
  return ext;
}

// ==================== HEIC CONVERSION ====================

let sharpModule = null;
async function getSharp() {
  if (!sharpModule) {
    sharpModule = (await import("sharp")).default;
  }
  return sharpModule;
}

async function convertHeicToJpeg(buffer) {
  const sharp = await getSharp();
  return sharp(buffer).jpeg({ quality: 90 }).toBuffer();
}

// ==================== SCRAPING ====================

/**
 * Import the actual scraping functions from the app.
 * We call them directly since we're in the same repo.
 */
let parseOswiadczeniePdfFn = null;
let ocrExtractStructuredFn = null;

async function loadScrapingFunctions() {
  // Dynamic import — these are TypeScript files, need tsx or compilation
  // For .mjs script, we'll call the API endpoint instead
  return null;
}

/**
 * Scrape a single attachment by calling the local API endpoint.
 * This reuses the full production pipeline including OCR, rotation, etc.
 */
async function scrapeAttachment(attachmentId) {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  // We can't use the API directly (needs auth).
  // Instead, we use Prisma + Supabase + the OCR module directly.
  // Load the module dynamically via a child process call.
  // Actually — let's use a simpler approach: call the scrape endpoint
  // with a special header, or directly import the functions.

  // Since this is a .mjs file and the parser is .ts, we need to
  // use the compiled version or use tsx. Let's use a direct HTTP call
  // with API key auth.
  return null;
}

// ==================== MAIN ====================

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  IMPORT DOKUMENTOW CUDZOZIEMCOW`);
  console.log(`  Zrodlo: ${sourceDir}`);
  console.log(`  Tryb: ${DRY_RUN ? "DRY-RUN (bez zapisu)" : "PRODUKCYJNY"}`);
  console.log(`  Scrapowanie: ${DO_SCRAPE ? "TAK" : "NIE"}`);
  if (ONLY_FOLDERS) console.log(`  Tylko foldery: ${ONLY_FOLDERS.join(", ")}`);
  console.log(`${"=".repeat(60)}\n`);

  // 1. Load all existing foreigners
  const allForeigners = await db.fdkForeigner.findMany({
    select: { id: true, imie: true, nazwisko: true, obywatelstwo: true },
  });
  console.log(`Istniejacych profili w bazie: ${allForeigners.length}`);

  // Build lookup: exact key map + token arrays for subset matching
  const foreignerMap = new Map(); // key → [foreigner, ...]
  const foreignerTokens = []; // [{foreigner, tokens}]
  for (const f of allForeigners) {
    const fullName = `${f.imie ?? ""} ${f.nazwisko}`.trim();
    const tokens = normalizeNameTokens(fullName);
    const key = nameKey(tokens);
    if (!foreignerMap.has(key)) foreignerMap.set(key, []);
    foreignerMap.get(key).push(f);
    foreignerTokens.push({ foreigner: f, tokens });
  }

  // 2. Enumerate person directories
  let personDirs;
  try {
    personDirs = fs.readdirSync(sourceDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch (err) {
    console.error(`Nie mozna odczytac katalogu: ${sourceDir}\n${err.message}`);
    process.exit(1);
  }

  if (ONLY_FOLDERS) {
    personDirs = personDirs.filter((d) => ONLY_FOLDERS.some((f) => d === f || d.toLowerCase() === f.toLowerCase()));
  }

  console.log(`Katalogow osob: ${personDirs.length}\n`);

  // 3. Process each person
  const report = []; // [{osoba, profil, plik, kategoria, scrape, typDokumentu, uwagi}]
  const summary = {
    total: personDirs.length,
    matched: 0,
    created: 0,
    skipped: 0,
    ambiguous: 0,
    filesUploaded: 0,
    filesSkippedDedup: 0,
    filesSkippedType: 0,
    archivesToUnpack: [],
    createdProfiles: [],
    ambiguousProfiles: [],
    scrapeOk: 0,
    scrapePartial: 0,
    scrapeError: 0,
    scrapeSkipped: 0,
  };

  // Load existing attachments for dedup
  const existingAttachments = await db.fdkAttachment.findMany({
    select: { foreignerId: true, nazwaPliku: true, rozmiarBytes: true },
  });
  const attachmentDedup = new Set();
  for (const a of existingAttachments) {
    attachmentDedup.add(`${a.foreignerId}|${a.nazwaPliku}|${a.rozmiarBytes}`);
  }

  for (const personDir of personDirs) {
    const personPath = path.join(sourceDir, personDir);
    const parsed = parseFolderName(personDir);
    const folderTokens = normalizeNameTokens(`${parsed.imie ?? ""} ${parsed.nazwisko}`.trim());
    const key = nameKey(folderTokens);

    console.log(`\n--- ${personDir} ---`);
    console.log(`  Parsed: imie="${parsed.imie}", nazwisko="${parsed.nazwisko}", key="${key}"`);

    // Match: first exact, then subset (folder tokens ⊂ DB tokens or DB tokens ⊂ folder tokens)
    let matches = foreignerMap.get(key) || [];

    // If no exact match, try subset matching
    if (matches.length === 0 && folderTokens.length > 0) {
      const subsetMatches = foreignerTokens.filter(({ tokens }) => {
        if (tokens.length === 0 || tokens.join("|") === key) return false;
        // One set contains the other
        const aSubB = folderTokens.every((t) => tokens.includes(t));
        const bSubA = tokens.every((t) => folderTokens.includes(t));
        return aSubB || bSubA;
      });
      if (subsetMatches.length > 0) {
        matches = subsetMatches.map((s) => s.foreigner);
        console.log(`  Dopasowanie podzbiorowe: ${matches.map((m) => `id=${m.id} ${m.imie} ${m.nazwisko}`).join(", ")}`);
      }
    }

    let foreignerId = null;
    let profileStatus = "";

    if (matches.length === 1) {
      foreignerId = matches[0].id;
      profileStatus = "istniejacy";
      summary.matched++;
      console.log(`  DOPASOWANIE: id=${foreignerId} (${matches[0].imie} ${matches[0].nazwisko})`);
    } else if (matches.length > 1) {
      profileStatus = "pominiety-niejednoznaczny";
      summary.ambiguous++;
      summary.ambiguousProfiles.push({
        folder: personDir,
        candidates: matches.map((m) => `id=${m.id} ${m.imie} ${m.nazwisko}`),
      });
      console.log(`  NIEJEDNOZNACZNE (${matches.length} dopasan): ${matches.map((m) => `id=${m.id}`).join(", ")}`);
      report.push({
        osoba: personDir,
        profil: profileStatus,
        plik: "",
        kategoria: "",
        scrape: "",
        typDokumentu: "",
        uwagi: `Niejednoznaczne dopasowanie: ${matches.map((m) => `id=${m.id} ${m.imie} ${m.nazwisko}`).join("; ")}`,
      });
      continue;
    } else {
      // No match → create
      if (DRY_RUN) {
        profileStatus = "DO_UTWORZENIA";
        summary.created++;
        summary.createdProfiles.push({ folder: personDir, imie: parsed.imie, nazwisko: parsed.nazwisko });
        console.log(`  BRAK DOPASOWANIA → profil DO UTWORZENIA: ${parsed.imie} ${parsed.nazwisko}`);
      } else {
        const newForeigner = await db.fdkForeigner.create({
          data: {
            imie: parsed.imie || null,
            nazwisko: parsed.nazwisko,
          },
        });
        foreignerId = newForeigner.id;
        profileStatus = "utworzony";
        summary.created++;
        summary.createdProfiles.push({ folder: personDir, imie: parsed.imie, nazwisko: parsed.nazwisko, id: newForeigner.id });

        // Log creation
        await db.fdkChangeLog.create({
          data: {
            foreignerId,
            changedBy: CHANGED_BY,
            field: "foreigner_create",
            oldValue: null,
            newValue: `Import kartoteki z dysku (partia ${BATCH_NAME}) — utworzono profil: ${parsed.imie ?? ""} ${parsed.nazwisko}`,
          },
        });

        // Add to map for future dedup
        if (!foreignerMap.has(key)) foreignerMap.set(key, []);
        foreignerMap.get(key).push(newForeigner);

        console.log(`  UTWORZONO profil: id=${foreignerId} — ZWERYFIKOWAĆ IMIĘ/NAZWISKO`);
      }
    }

    // Collect files
    const allFiles = walkDir(personPath);
    const filesToProcess = [];
    const archives = [];

    for (const filePath of allFiles) {
      const fileName = path.basename(filePath);
      const ext = path.extname(fileName).toLowerCase().replace(".", "");
      const relPath = path.relative(personPath, filePath);

      // Skip Mac OS resource forks
      if (fileName.startsWith("._")) continue;
      // Skip temp Word files
      if (fileName.startsWith("~$")) continue;
      // Skip by filename
      if (SKIP_FILES.has(fileName.toLowerCase())) continue;
      // Skip by extension
      if (SKIP_EXTS.has(ext)) continue;

      // Archives → report only
      if (ARCHIVE_EXTS.has(ext)) {
        archives.push({ filePath, fileName, relPath });
        summary.archivesToUnpack.push(`${personDir}/${relPath}`);
        report.push({
          osoba: personDir,
          profil: profileStatus,
          plik: fileName,
          kategoria: "",
          scrape: "",
          typDokumentu: "",
          uwagi: "ARCHIWUM — rozpakować ręcznie",
        });
        continue;
      }

      // Importable?
      if (IMPORTABLE_EXTS.has(ext) || ext === DOCX_EXT) {
        const kategoria = getKategoriaForFile(relPath, ext);
        filesToProcess.push({ filePath, fileName, ext, relPath, kategoria });
      } else {
        summary.filesSkippedType++;
      }
    }

    console.log(`  Pliki do importu: ${filesToProcess.length}, archiwa: ${archives.length}`);

    if (DRY_RUN) {
      // In dry-run mode, just show what would happen
      for (const f of filesToProcess) {
        const fileSize = fs.statSync(f.filePath).size;
        const scrapable = f.kategoria !== "inne" && f.ext !== DOCX_EXT && IMPORTABLE_EXTS.has(f.ext);
        console.log(`    [${f.kategoria}] ${f.relPath} (${(fileSize / 1024).toFixed(1)} KB) ${scrapable ? "→ scrape" : "→ bez scrapowania"}`);
        report.push({
          osoba: personDir,
          profil: profileStatus,
          plik: f.fileName,
          kategoria: f.kategoria,
          scrape: scrapable ? "do_scrapowania" : "pominiety",
          typDokumentu: "",
          uwagi: "",
        });
      }
      continue;
    }

    // Upload files
    if (!foreignerId) continue;

    // Log import batch in history
    await db.fdkChangeLog.create({
      data: {
        foreignerId,
        changedBy: CHANGED_BY,
        field: "import_batch",
        oldValue: null,
        newValue: `Import kartoteki z dysku (partia ${BATCH_NAME}) — ${filesToProcess.length} plików`,
      },
    });

    const uploadedAttachmentIds = []; // for scraping

    for (const f of filesToProcess) {
      const fileSize = fs.statSync(f.filePath).size;

      // Dedup check
      const dedupKey = `${foreignerId}|${f.fileName}|${fileSize}`;
      if (attachmentDedup.has(dedupKey)) {
        console.log(`    [DEDUP] ${f.fileName}`);
        summary.filesSkippedDedup++;
        report.push({
          osoba: personDir,
          profil: profileStatus,
          plik: f.fileName,
          kategoria: f.kategoria,
          scrape: "",
          typDokumentu: "",
          uwagi: "DEDUP — plik juz istnieje",
        });
        continue;
      }

      let fileBuffer = fs.readFileSync(f.filePath);
      let actualExt = f.ext;
      let actualFileName = f.fileName;

      // HEIC → JPEG conversion
      if (f.ext === "heic") {
        try {
          fileBuffer = await convertHeicToJpeg(fileBuffer);
          actualExt = "jpeg";
          actualFileName = f.fileName.replace(/\.heic$/i, ".jpeg");
          console.log(`    [HEIC→JPEG] ${f.fileName}`);
        } catch (err) {
          console.error(`    [HEIC FAIL] ${f.fileName}: ${err.message}`);
          report.push({
            osoba: personDir,
            profil: profileStatus,
            plik: f.fileName,
            kategoria: f.kategoria,
            scrape: "blad",
            typDokumentu: "",
            uwagi: `Konwersja HEIC nieudana: ${err.message}`,
          });
          continue;
        }
      }

      const typPliku = getTypPliku(actualExt);
      const safeName = actualFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${foreignerId}/${randomUUID()}-${safeName}`;

      // MIME type
      const mimeMap = {
        pdf: "application/pdf",
        jpeg: "image/jpeg",
        jpg: "image/jpeg",
        png: "image/png",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
      const mime = mimeMap[typPliku] ?? "application/octet-stream";

      // Upload to Supabase
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: mime,
          upsert: false,
        });

      if (uploadError) {
        console.error(`    [UPLOAD FAIL] ${f.fileName}: ${uploadError.message}`);
        report.push({
          osoba: personDir,
          profil: profileStatus,
          plik: f.fileName,
          kategoria: f.kategoria,
          scrape: "blad",
          typDokumentu: "",
          uwagi: `Upload error: ${uploadError.message}`,
        });
        continue;
      }

      // Create DB record
      const attachment = await db.fdkAttachment.create({
        data: {
          foreignerId,
          kategoria: f.kategoria,
          nazwaWyswietlana: displayName(actualFileName),
          nazwaPliku: actualFileName,
          opis: null,
          typPliku,
          storagePath,
          rozmiarBytes: fileBuffer.length,
        },
      });

      // Log upload
      await db.fdkChangeLog.create({
        data: {
          foreignerId,
          changedBy: CHANGED_BY,
          field: "attachment_upload",
          oldValue: null,
          newValue: `Wgrano załącznik: ${displayName(actualFileName)} (${f.kategoria})`,
        },
      });

      // Track for dedup
      attachmentDedup.add(dedupKey);
      summary.filesUploaded++;

      const scrapable = f.kategoria !== "inne" && IMPORTABLE_EXTS.has(actualExt) && actualExt !== DOCX_EXT;
      if (scrapable) {
        uploadedAttachmentIds.push(attachment.id);
      }

      console.log(`    [OK] [${f.kategoria}] ${f.fileName} (${(fileBuffer.length / 1024).toFixed(1)} KB) id=${attachment.id}`);

      report.push({
        osoba: personDir,
        profil: profileStatus,
        plik: f.fileName,
        kategoria: f.kategoria,
        scrape: scrapable ? "oczekuje" : "pominiety",
        typDokumentu: "",
        uwagi: "",
        attachmentId: attachment.id,
      });
    }

    // Scrape if requested
    if (DO_SCRAPE && uploadedAttachmentIds.length > 0) {
      console.log(`  Scrapowanie ${uploadedAttachmentIds.length} zalacznikow...`);
      for (const attId of uploadedAttachmentIds) {
        const reportEntry = report.find((r) => r.attachmentId === attId);
        try {
          const result = await scrapeViaDb(attId);
          if (result.ok) {
            if (reportEntry) {
              reportEntry.scrape = result.partial ? "partial" : "OK";
              reportEntry.typDokumentu = result.detectedType || "";
            }
            if (result.partial) summary.scrapePartial++;
            else summary.scrapeOk++;
            console.log(`    [SCRAPE OK] id=${attId} typ=${result.detectedType || "?"}`);
          } else {
            if (reportEntry) {
              reportEntry.scrape = "blad";
              reportEntry.uwagi = result.error || "";
            }
            summary.scrapeError++;
            console.log(`    [SCRAPE FAIL] id=${attId}: ${result.error}`);
          }
        } catch (err) {
          if (reportEntry) {
            reportEntry.scrape = "blad";
            reportEntry.uwagi = err.message;
          }
          summary.scrapeError++;
          console.error(`    [SCRAPE ERROR] id=${attId}: ${err.message}`);

          // Retry once
          try {
            console.log(`    [RETRY] id=${attId}`);
            const result2 = await scrapeViaDb(attId);
            if (result2.ok) {
              if (reportEntry) {
                reportEntry.scrape = result2.partial ? "partial" : "OK";
                reportEntry.typDokumentu = result2.detectedType || "";
                reportEntry.uwagi = "OK po retry";
              }
              summary.scrapeError--;
              if (result2.partial) summary.scrapePartial++;
              else summary.scrapeOk++;
              console.log(`    [RETRY OK] id=${attId}`);
            }
          } catch (err2) {
            console.error(`    [RETRY FAIL] id=${attId}: ${err2.message}`);
          }
        }
      }
    }
  }

  // Print summary
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  PODSUMOWANIE`);
  console.log(`${"=".repeat(60)}`);
  console.log(`  Osob ogółem:         ${summary.total}`);
  console.log(`  Dopasowanych:        ${summary.matched}`);
  console.log(`  Utworzonych:          ${summary.created}`);
  console.log(`  Pominiętych (ambig): ${summary.ambiguous}`);
  console.log(`  Plików wgranych:     ${summary.filesUploaded}`);
  console.log(`  Plików DEDUP:        ${summary.filesSkippedDedup}`);
  console.log(`  Plików pominietych:  ${summary.filesSkippedType}`);
  if (DO_SCRAPE) {
    console.log(`  Scrape OK:           ${summary.scrapeOk}`);
    console.log(`  Scrape partial:      ${summary.scrapePartial}`);
    console.log(`  Scrape błąd:         ${summary.scrapeError}`);
  }

  if (summary.archivesToUnpack.length > 0) {
    console.log(`\n  ARCHIWA DO RECZNEGO ROZPAKOWANIA (${summary.archivesToUnpack.length}):`);
    for (const a of summary.archivesToUnpack) {
      console.log(`    - ${a}`);
    }
  }

  if (summary.createdProfiles.length > 0) {
    console.log(`\n  PROFILE ${DRY_RUN ? "DO UTWORZENIA" : "UTWORZONE"} — ZWERYFIKOWAC (${summary.createdProfiles.length}):`);
    for (const p of summary.createdProfiles) {
      console.log(`    - ${p.folder} → imie="${p.imie}", nazwisko="${p.nazwisko}"${p.id ? ` (id=${p.id})` : ""}`);
    }
  }

  if (summary.ambiguousProfiles.length > 0) {
    console.log(`\n  NIEJEDNOZNACZNE DOPASOWANIA (${summary.ambiguousProfiles.length}):`);
    for (const p of summary.ambiguousProfiles) {
      console.log(`    - ${p.folder}: ${p.candidates.join(" | ")}`);
    }
  }

  // Cost estimate for scraping
  if (DRY_RUN) {
    const scrapableCount = report.filter((r) => r.scrape === "do_scrapowania").length;
    console.log(`\n  SZACUNEK KOSZTOW OCR:`);
    console.log(`    Dokumentów do scrapowania: ${scrapableCount}`);
    console.log(`    Szacunkowy koszt (Claude Sonnet): ~$${(scrapableCount * 0.04).toFixed(2)} - $${(scrapableCount * 0.08).toFixed(2)}`);
    console.log(`    (przy zalozeniu ~$0.04-0.08 per dokument, srednia wielkosc)`);
  }

  // Write CSV report
  if (REPORT_FILE) {
    const csvLines = ["osoba;profil;plik;kategoria;scrape;typ_dokumentu;uwagi"];
    for (const r of report) {
      csvLines.push(
        [r.osoba, r.profil, r.plik, r.kategoria, r.scrape, r.typDokumentu, r.uwagi]
          .map((v) => `"${(v || "").replace(/"/g, '""')}"`)
          .join(";")
      );
    }
    fs.writeFileSync(REPORT_FILE, csvLines.join("\n"), "utf-8");
    console.log(`\n  Raport zapisany: ${REPORT_FILE}`);
  }

  console.log();
}

// ==================== JUNK VALUE DETECTION ====================

function isJunkFieldValue(value) {
  if (!value || typeof value !== "string") return false;
  const v = value.trim();
  if (v.length === 0) return true;
  if (v.endsWith(":")) return true;
  if (/Imi[eę]\s*:|Nazwisko\s*:|rodzaj\s+pracy\s*:|podpis\s+osoby|Wnioskowana\s+liczba|i\s+podpis\s+osoby/i.test(v)) return true;
  const slashCount = (v.match(/\//g) ?? []).length;
  if (slashCount >= 2 && v.length > 40) return true;
  if (/^\s*\/\s*rodzaj\s+pracy/i.test(v)) return true;
  return false;
}

// ==================== SCRAPING VIA DIRECT DB + SUPABASE ====================

/**
 * Scrape attachment by downloading from Supabase and calling OCR directly.
 * This replicates the logic from /api/fdk/attachments/[id]?action=scrape
 * but runs in-process without HTTP/auth overhead.
 */
async function scrapeViaDb(attachmentId) {
  const attachment = await db.fdkAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) return { ok: false, error: "Attachment not found" };

  const scrapableTypes = ["pdf", "jpeg", "jpg", "png"];
  if (!scrapableTypes.includes(attachment.typPliku)) {
    return { ok: false, error: `Unsupported type: ${attachment.typPliku}` };
  }

  // Download from Supabase
  const { data: fileData, error: dlError } = await supabase.storage
    .from(BUCKET)
    .download(attachment.storagePath);

  if (dlError || !fileData) {
    return { ok: false, error: `Download failed: ${dlError?.message}` };
  }

  const buffer = await fileData.arrayBuffer();

  // Dynamically import the parser (TypeScript — needs compilation)
  // Since we can't directly import .ts in .mjs, we use a workaround:
  // Call the scrape API endpoint locally.
  // But we need auth... Let's try dynamic import with tsx loader if available.

  // Alternative: use the Anthropic SDK directly for OCR
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Brak ANTHROPIC_API_KEY" };
  }

  const isImage = ["jpeg", "jpg", "png"].includes(attachment.typPliku);
  const isPdf = attachment.typPliku === "pdf";

  // For PDFs, first try text extraction
  let parsed = null;
  if (isPdf) {
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const pdfData = await pdfParse(Buffer.from(buffer));
      if (pdfData.text && pdfData.text.trim().length > 50) {
        // Has text layer — try regex parsing first
        parsed = parseOswiadczenieTextBasic(pdfData.text, attachment.nazwaPliku);
      }
    } catch {
      // No text layer or parse error — will fall through to OCR
    }
  }

  // If no text-layer result, use OCR
  if (!parsed || !parsed.detectedType) {
    parsed = await ocrExtract(buffer, isImage, isPdf, attachment.nazwaPliku, apiKey);
  }

  if (!parsed) {
    return { ok: false, error: "OCR nie zwrocil danych" };
  }

  // Apply results to foreigner profile
  const foreigner = await db.fdkForeigner.findUnique({ where: { id: attachment.foreignerId } });
  if (!foreigner) return { ok: false, error: "Foreigner not found" };

  // Check if document belongs to a different person
  const extractedFullName = `${parsed.imie ?? ""} ${parsed.nazwisko ?? ""}`.trim();
  const profileFullName = `${foreigner.imie ?? ""} ${foreigner.nazwisko ?? ""}`.trim();
  if (extractedFullName.length > 2 && profileFullName.length > 2 && foreigner.nazwisko !== "Nowy") {
    const eTokens = normalizeNameTokens(extractedFullName);
    const pTokens = normalizeNameTokens(profileFullName);
    let matchCount = 0;
    for (const et of eTokens) {
      for (const pt of pTokens) {
        if (et === pt || (et.length >= 3 && pt.length >= 3 && (et.startsWith(pt.substring(0, 3)) || pt.startsWith(et.substring(0, 3))))) {
          matchCount++; break;
        }
      }
    }
    if (matchCount === 0) {
      // Different person — flag and skip
      await db.fdkAttachment.update({
        where: { id: attachment.id },
        data: { opis: `\u26a0 Dokument innej osoby: ${extractedFullName}` },
      });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: attachment.foreignerId,
          changedBy: CHANGED_BY,
          field: "scrape",
          oldValue: null,
          newValue: `Scrape ${attachment.nazwaPliku}: INNA OSOBA (${extractedFullName}) — podstawa NIE utworzona. Profil: ${profileFullName}.`,
        },
      });
      return { ok: true, detectedType: parsed.detectedType, partial: false, differentPerson: extractedFullName };
    }
  }

  const updateData = {};
  if (parsed.imie && !foreigner.imie) updateData.imie = parsed.imie;
  if (parsed.nazwisko && foreigner.nazwisko === "Nowy") updateData.nazwisko = parsed.nazwisko;
  if (parsed.dataUrodzenia && !foreigner.dataUrodzenia) updateData.dataUrodzenia = new Date(parsed.dataUrodzenia);
  if (parsed.obywatelstwo && !foreigner.obywatelstwo) updateData.obywatelstwo = parsed.obywatelstwo;
  if (parsed.nrPaszportu && !foreigner.nrPaszportu) updateData.nrPaszportu = parsed.nrPaszportu;

  if (Object.keys(updateData).length > 0) {
    await db.fdkForeigner.update({ where: { id: attachment.foreignerId }, data: updateData });
    for (const [key, value] of Object.entries(updateData)) {
      await db.fdkChangeLog.create({
        data: {
          foreignerId: attachment.foreignerId,
          changedBy: CHANGED_BY,
          field: key,
          oldValue: null,
          newValue: value instanceof Date ? value.toISOString().slice(0, 10) : String(value),
        },
      });
    }
  }

  // Walidacja numerów: muszą zawierać co najmniej jedną cyfrę
  if (parsed.nrOswiadczenia && !/\d/.test(parsed.nrOswiadczenia)) parsed.nrOswiadczenia = null;
  if (parsed.nrDecyzji && !/\d/.test(parsed.nrDecyzji)) parsed.nrDecyzji = null;

  // Walidacja: odrzucaj wartości-etykiety formularza
  if (parsed.stanowisko && isJunkFieldValue(parsed.stanowisko)) parsed.stanowisko = null;
  if (parsed.firma && isJunkFieldValue(parsed.firma)) parsed.firma = null;
  if (parsed.rodzajUmowy && isJunkFieldValue(parsed.rodzajUmowy)) parsed.rodzajUmowy = null;

  // Guard: nie twórz podstawy bez dat i numeru dokumentu
  const hasUsefulData = parsed.dataOd || parsed.dataDo || parsed.nrDecyzji || parsed.nrOswiadczenia;
  if (!hasUsefulData) {
    await db.fdkChangeLog.create({
      data: {
        foreignerId: attachment.foreignerId,
        changedBy: CHANGED_BY,
        field: "scrape",
        oldValue: null,
        newValue: `Scrape ${attachment.nazwaPliku}: nieczytelny/formularz — brak dat i numeru. Podstawa NIE utworzona.`,
      },
    });
    return { ok: true, detectedType: parsed.detectedType || "?", partial: true, junkSkipped: true };
  }

  // Create/update employment base (skip ODWOLANIE)
  if (parsed.detectedType === "ODWOLANIE") {
    await db.fdkChangeLog.create({
      data: {
        foreignerId: attachment.foreignerId,
        changedBy: CHANGED_BY,
        field: "scrape",
        oldValue: null,
        newValue: `Rozpoznano odwolanie w pliku: ${attachment.nazwaPliku}. Podstawa NIE utworzona.`,
      },
    });
    return { ok: true, detectedType: "ODWOLANIE", partial: false };
  }

  if (!parsed.detectedType) {
    // Nie twórz podstawy jeśli typ dokumentu nierozpoznany — fallback na OSWIADCZENIE
    // powodował fałszywe wpisy.
    await db.fdkChangeLog.create({
      data: {
        foreignerId: attachment.foreignerId,
        changedBy: CHANGED_BY,
        field: "scrape",
        oldValue: null,
        newValue: `Scrape ${attachment.nazwaPliku}: nierozpoznany typ dokumentu — podstawa NIE utworzona.`,
      },
    });
    return { ok: true, detectedType: "?", partial: true };
  }
  const docType = parsed.detectedType;

  // WIZA — save to wizaDo on foreigner profile, don't create employment base
  if (docType === "WIZA" && parsed.dataDo) {
    const dataDo = new Date(parsed.dataDo);
    if (!foreigner.wizaDo || dataDo > foreigner.wizaDo) {
      await db.fdkForeigner.update({
        where: { id: attachment.foreignerId },
        data: { wizaDo: dataDo },
      });
    }
    await db.fdkChangeLog.create({
      data: {
        foreignerId: attachment.foreignerId,
        changedBy: CHANGED_BY,
        field: "scrape",
        oldValue: null,
        newValue: `Rozpoznano wizę w pliku: ${attachment.nazwaPliku}. wizaDo=${parsed.dataDo}.`,
      },
    });
    return { ok: true, detectedType: "WIZA", partial: false };
  }

  // Match existing base
  let existingBase = null;
  if (docType === "OSWIADCZENIE" && parsed.nrOswiadczenia) {
    existingBase = await db.fdkEmploymentBase.findFirst({
      where: { foreignerId: attachment.foreignerId, typ: docType, nrOswiadczenia: parsed.nrOswiadczenia },
    });
  } else if (docType !== "OSWIADCZENIE" && parsed.nrDecyzji) {
    existingBase = await db.fdkEmploymentBase.findFirst({
      where: { foreignerId: attachment.foreignerId, typ: docType, nrDecyzji: parsed.nrDecyzji },
    });
  }
  if (!existingBase && parsed.dataOd && parsed.dataDo) {
    existingBase = await db.fdkEmploymentBase.findFirst({
      where: {
        foreignerId: attachment.foreignerId,
        typ: docType,
        dataOd: new Date(parsed.dataOd),
        dataDo: new Date(parsed.dataDo),
      },
    });
  }

  const baseData = {
    foreignerId: attachment.foreignerId,
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

  if (parsed.wynagrodzenie) {
    baseData.wynagrodzenie = parsed.wynagrodzenie;
  }

  let baseId;
  let action;
  if (existingBase) {
    const updateFields = {};
    for (const [key, value] of Object.entries(baseData)) {
      if (key === "foreignerId") continue;
      if (value !== null && value !== undefined) {
        updateFields[key] = value;
      }
    }
    await db.fdkEmploymentBase.update({ where: { id: existingBase.id }, data: updateFields });
    baseId = existingBase.id;
    action = `Zaktualizowano podstawe #${baseId} (${docType}) z pliku: ${attachment.nazwaPliku}`;
  } else {
    const base = await db.fdkEmploymentBase.create({ data: baseData });
    baseId = base.id;
    action = `Utworzono podstawe #${baseId} (${docType}) z pliku: ${attachment.nazwaPliku}`;
  }

  await db.fdkChangeLog.create({
    data: {
      foreignerId: attachment.foreignerId,
      changedBy: CHANGED_BY,
      field: "scrape",
      oldValue: null,
      newValue: action,
    },
  });

  // Handle residence permits
  if ((docType === "KARTA_POBYTU" || docType === "BLUE_CARD") && parsed.dataDo) {
    const dataDo = new Date(parsed.dataDo);
    if (!foreigner.decyzjaPobytowaDo || dataDo > foreigner.decyzjaPobytowaDo) {
      await db.fdkForeigner.update({
        where: { id: attachment.foreignerId },
        data: { decyzjaPobytowaDo: dataDo },
      });
    }
  }

  const partial = !parsed.dataOd || !parsed.dataDo || !parsed.detectedType;
  return { ok: true, detectedType: docType, partial };
}

// ==================== BASIC TEXT PARSING (replicated from pdf-parser.ts) ====================

function parseOswiadczenieTextBasic(text, filename) {
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

  // Extract dates
  const datePattern = /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/g;
  const dates = [];
  let m;
  while ((m = datePattern.exec(text)) !== null) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const y = parseInt(m[3], 10);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 1980 && y <= 2040) {
      dates.push(`${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
  }

  // Nr oswiadczenia
  const nrOswMatch = text.match(/(?:PZC|OP\.G)[.\s]*\d{4}[.\s]*\d+[.\s]*\w*[.\s]*\d{4}/);
  if (nrOswMatch) result.nrOswiadczenia = nrOswMatch[0].trim();

  // Nr decyzji
  const nrDecMatch = text.match(/(?:DL\.WIPO|WSC[\w-]*)[.\s]*\d{4}[.\s]*\d+[.\s]*\d{4}/);
  if (nrDecMatch) result.nrDecyzji = nrDecMatch[0].trim();

  return result;
}

// ==================== OCR VIA ANTHROPIC SDK ====================

async function ocrExtract(buffer, isImage, isPdf, filename, apiKey) {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey });

  const fileSizeMB = buffer.byteLength / 1024 / 1024;
  if (buffer.byteLength > 25 * 1024 * 1024) {
    console.log(`    [OCR] Plik za duzy: ${fileSizeMB.toFixed(1)} MB (max 25 MB) — pomijam`);
    return null;
  }

  const base64 = Buffer.from(buffer).toString("base64");
  const useHaiku = !isPdf && buffer.byteLength > 2 * 1024 * 1024;
  const model = useHaiku ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-6";

  console.log(`    [OCR] ${filename} (${fileSizeMB.toFixed(1)} MB) model=${model}`);

  const extractionPrompt = `Ten obraz to strona polskiego dokumentu imigracyjnego (decyzja pobytowa, zezwolenie na prace, oswiadczenie o powierzeniu pracy, wiza lub karta pobytu). Obraz moze byc OBROCONY — odczytaj tekst niezaleznie od orientacji.

ZADANIE: Wyciagnij dane i zwroc TYLKO JSON (bez komentarzy, bez markdown):

{"detectedType":"KARTA_POBYTU","imie":"...","nazwisko":"...","dataUrodzenia":"YYYY-MM-DD","obywatelstwo":"kraj","nrPaszportu":"...","dataOd":"YYYY-MM-DD","dataDo":"YYYY-MM-DD","stanowisko":"...","rodzajUmowy":"...","firma":"...","nrDecyzji":"...","nrOswiadczenia":"...","wynagrodzenie":"..."}

KRYTYCZNE ZASADY DLA DECYZJI POBYTOWYCH (dokumenty z naglowkiem urzedu/wojewody):
1. Dokument ma 3 czesci: NAGLOWEK (sygnatura, data, organ) → SENTENCJA (od "postanawiam"/"udzielam"/"orzekam" do "UZASADNIENIE") → UZASADNIENIE + POUCZENIE.
2. WSZYSTKIE pola merytoryczne bierz WYLACZNIE z SENTENCJI. W uzasadnieniu sa kwoty, daty i nazwy z INNYCH decyzji — IGNORUJ JE.
3. dataOd = data z naglowka: "Warszawa, dnia DD.MM.RRRR r." lub "dnia DD.MM.RRRR"
4. dataDo = z sentencji: "do dnia DD.MM.RRRR" lub "z terminem waznosci do dnia DD.MM.RRRR"
5. wynagrodzenie = TYLKO z sentencji: "za wynagrodzeniem nie nizszym niz KWOTA zl brutto". NIGDY nie bierz kwot z uzasadnienia.
6. firma = z sentencji: "na rzecz podmiotu NAZWA FIRMY Sp. z o.o., ul. Adres". Podaj PELNA nazwe.
7. nrDecyzji = sygnatura z naglowka (pod nazwa organu). Zachowaj CALY numer z prefiksem.
8. detectedType: jesli mowi o "wysokich kwalifikacjach" lub art. 127 → BLUE_CARD; jesli "udzielam zezwolenia na pobyt" → KARTA_POBYTU; jesli to wiza (krajowa, Schengen, typu D/C) → WIZA.
9. obywatelstwo: TYLKO nazwa kraju.

DLA OSWIADCZEN (formularze PSZ-OPWP):
- detectedType = OSWIADCZENIE
- nrOswiadczenia = numer wpisu (PZC.4390.XXXXX.XX.RRRR)
- wynagrodzenie = kwota z pola stawki/wynagrodzenia brutto

DLA POWIADOMIEN/ZGLOSZEN (obywatele Ukrainy):
- Jesli dokument to "powiadomienie o powierzeniu pracy" lub "zgloszenie o powierzeniu pracy" (formularz dla obywateli UA) → detectedType = ZGLOSZENIE_UA
- Te dokumenty NIE maja daty koncowej (dataDo = null)
- dataOd = data powiadomienia/zgloszenia

Pola, ktorych nie mozesz znalezc = null.`;

  try {
    const mediaType = isPdf
      ? "application/pdf"
      : isImage
        ? "image/jpeg"
        : "image/png";

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
      .join("\n")
      .trim();

    // Parse JSON
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
      let cit = data.obywatelstwo.trim();
      cit = cit.replace(/\s+(zezwolenie|pobyt|prac|decyzj|czasow|kart|na|do|dnia|terytorium).*$/i, "").trim();
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
      let wyn = data.wynagrodzenie.trim();
      wyn = wyn.replace(/\s+\d+\.\s*$/, "").replace(/\.\s*$/, "").trim();
      if (wyn.length > 2) result.wynagrodzenie = wyn;
    }

    const hasAnyData = result.dataOd || result.dataDo || result.nazwisko || result.imie
      || result.stanowisko || result.nrPaszportu || result.nrDecyzji || result.wynagrodzenie;

    return hasAnyData ? result : null;

  } catch (err) {
    console.error(`    [OCR ERROR] ${filename}: ${err.message}`);
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
