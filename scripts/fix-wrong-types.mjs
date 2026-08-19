/**
 * Fix wrong employment base types created by scraper bugs:
 *   1. BLUE_CARD that should be KARTA_POBYTU or ZEZWOLENIE
 *      (regex matched "wysokie kwalifikacje" / "art. 127" in UZASADNIENIE)
 *   2. OSWIADCZENIE that should be something else
 *      (fallback "detectedType || OSWIADCZENIE" when type was unknown)
 *
 * Logic:
 *   - Find all bases created by scraper (changedBy = import-dokumenty / scrape-pending)
 *   - For each, re-download the source attachment and re-parse with fixed logic
 *   - If new type differs → update or delete
 *
 * Usage:
 *   node scripts/fix-wrong-types.mjs                    # dry-run
 *   node scripts/fix-wrong-types.mjs --run              # apply fixes
 *   node scripts/fix-wrong-types.mjs --run --report raport-fix-types.csv
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
const CHANGED_BY = "fix-wrong-types";

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");
const reportIdx = args.indexOf("--report");
const REPORT_FILE = reportIdx >= 0 ? args[reportIdx + 1] : null;

// ==================== FIXED TEXT PARSER ====================

function parseTextBasicFixed(text) {
  const result = {};

  // Use only sentencja (before UZASADNIENIE) to avoid false matches
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

  return result;
}

// ==================== MAIN ====================

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  FIX WRONG TYPES — napraw fałszywe BLUE_CARD i OSWIADCZENIE`);
  console.log(`  Tryb: ${DO_RUN ? "WYKONANIE" : "DRY-RUN"}`);
  console.log(`${"=".repeat(60)}\n`);

  // Find scrape logs that created/updated bases
  const scrapeLogs = await db.fdkChangeLog.findMany({
    where: {
      field: "scrape",
      changedBy: { in: ["import-dokumenty", "scrape-pending"] },
      newValue: { contains: "z pliku:" },
    },
    select: { foreignerId: true, newValue: true },
  });

  // Parse: "Utworzono/Zaktualizowano podstawę #ID (TYP) z pliku: FILENAME"
  const baseFileMap = new Map(); // baseId → { typ, filename, foreignerId }
  for (const log of scrapeLogs) {
    const match = log.newValue?.match(/(?:Utworzono|Zaktualizowano)\s+podstaw[eę]\s+#(\d+)\s+\((\w+)\)\s+z pliku:\s+(.+)$/);
    if (match) {
      const baseId = parseInt(match[1], 10);
      const typ = match[2];
      const filename = match[3].trim();
      baseFileMap.set(baseId, { typ, filename, foreignerId: log.foreignerId });
    }
  }

  console.log(`Podstaw stworzonych przez scraper: ${baseFileMap.size}`);

  // Focus on suspicious types: BLUE_CARD and OSWIADCZENIE
  const suspicious = [];
  for (const [baseId, info] of baseFileMap.entries()) {
    if (info.typ === "BLUE_CARD" || info.typ === "OSWIADCZENIE") {
      suspicious.push({ baseId, ...info });
    }
  }

  console.log(`Podejrzanych (BLUE_CARD + OSWIADCZENIE): ${suspicious.length}\n`);

  // Check which bases still exist
  const existingBases = await db.fdkEmploymentBase.findMany({
    where: { id: { in: suspicious.map((s) => s.baseId) } },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true } } },
  });

  const existingMap = new Map();
  for (const b of existingBases) {
    existingMap.set(b.id, b);
  }

  console.log(`Z nich istniejących w bazie: ${existingMap.size}\n`);

  // For each suspicious base, find and re-parse the source attachment
  const report = [];

  for (const sus of suspicious) {
    const base = existingMap.get(sus.baseId);
    if (!base) continue; // already deleted

    const personName = `${base.foreigner.imie ?? ""} ${base.foreigner.nazwisko}`.trim();

    // Find attachment by filename
    const attachment = await db.fdkAttachment.findFirst({
      where: { foreignerId: sus.foreignerId, nazwaPliku: sus.filename },
    });

    if (!attachment) {
      console.log(`  [SKIP] #${sus.baseId} [${sus.typ}] ${personName} — załącznik "${sus.filename}" nie znaleziony`);
      report.push({
        baseId: sus.baseId, osoba: personName, oldTyp: sus.typ,
        newTyp: "?", action: "SKIP", reason: "attachment_not_found",
      });
      continue;
    }

    // Only re-parse PDFs with text layer
    if (attachment.typPliku !== "pdf") {
      console.log(`  [SKIP] #${sus.baseId} [${sus.typ}] ${personName} — nie PDF (${attachment.typPliku})`);
      report.push({
        baseId: sus.baseId, osoba: personName, oldTyp: sus.typ,
        newTyp: "?", action: "SKIP", reason: `not_pdf_${attachment.typPliku}`,
      });
      continue;
    }

    // Download and parse
    try {
      const { data: fileData, error: dlError } = await supabase.storage
        .from(BUCKET)
        .download(attachment.storagePath);

      if (dlError || !fileData) {
        console.log(`  [SKIP] #${sus.baseId} [${sus.typ}] ${personName} — download error`);
        report.push({
          baseId: sus.baseId, osoba: personName, oldTyp: sus.typ,
          newTyp: "?", action: "SKIP", reason: "download_error",
        });
        continue;
      }

      const buffer = await fileData.arrayBuffer();
      const pdfParse = (await import("pdf-parse")).default;
      const pdfData = await pdfParse(Buffer.from(buffer));
      const textLen = (pdfData.text ?? "").replace(/\s/g, "").length;

      if (textLen < 100) {
        // No text layer — would need OCR to re-check, skip for now
        console.log(`  [SKIP] #${sus.baseId} [${sus.typ}] ${personName} — za mało tekstu (${textLen} zn.), potrzeba OCR`);
        report.push({
          baseId: sus.baseId, osoba: personName, oldTyp: sus.typ,
          newTyp: "?", action: "NEEDS_OCR", reason: `text_too_short_${textLen}`,
        });
        continue;
      }

      const parsed = parseTextBasicFixed(pdfData.text);
      const newType = parsed.detectedType || null;

      if (newType === sus.typ) {
        // Same type — no change needed
        console.log(`  [OK] #${sus.baseId} [${sus.typ}] ${personName} — typ potwierdza się`);
        report.push({
          baseId: sus.baseId, osoba: personName, oldTyp: sus.typ,
          newTyp: newType, action: "OK", reason: "confirmed",
        });
        continue;
      }

      // Type changed!
      if (!newType) {
        // Can't determine type → delete the base
        console.log(`  [DELETE] #${sus.baseId} [${sus.typ}] ${personName} — typ nierozpoznany → USUNĄĆ`);
        report.push({
          baseId: sus.baseId, osoba: personName, oldTyp: sus.typ,
          newTyp: "?", action: "DELETE", reason: "unrecognized_type",
        });

        if (DO_RUN) {
          await db.fdkChangeLog.create({
            data: {
              foreignerId: sus.foreignerId,
              changedBy: CHANGED_BY,
              field: "employment_base_delete",
              oldValue: JSON.stringify({ typ: base.typ, dataOd: base.dataOd, dataDo: base.dataDo }),
              newValue: `Usunięto fałszywą podstawę #${sus.baseId} (${sus.typ}) — po ponownym parsowaniu typ nierozpoznany. Plik: ${sus.filename}`,
            },
          });
          await db.fdkEmploymentBase.delete({ where: { id: sus.baseId } });
          console.log(`    → usunięto`);
        }
      } else {
        // Type changed to something else → update
        console.log(`  [FIX] #${sus.baseId} ${personName}: ${sus.typ} → ${newType}`);
        report.push({
          baseId: sus.baseId, osoba: personName, oldTyp: sus.typ,
          newTyp: newType, action: "FIX", reason: `retyped_${newType}`,
        });

        if (DO_RUN) {
          await db.fdkChangeLog.create({
            data: {
              foreignerId: sus.foreignerId,
              changedBy: CHANGED_BY,
              field: "employment_base_update",
              oldValue: sus.typ,
              newValue: `Zmieniono typ podstawy #${sus.baseId}: ${sus.typ} → ${newType}. Plik: ${sus.filename}`,
            },
          });
          await db.fdkEmploymentBase.update({
            where: { id: sus.baseId },
            data: { typ: newType },
          });
          console.log(`    → zmieniono na ${newType}`);
        }
      }
    } catch (err) {
      console.error(`  [ERROR] #${sus.baseId} ${personName}: ${err.message}`);
      report.push({
        baseId: sus.baseId, osoba: personName, oldTyp: sus.typ,
        newTyp: "?", action: "ERROR", reason: err.message.substring(0, 100),
      });
    }
  }

  // Summary
  const counts = { OK: 0, FIX: 0, DELETE: 0, SKIP: 0, NEEDS_OCR: 0, ERROR: 0 };
  for (const r of report) counts[r.action] = (counts[r.action] ?? 0) + 1;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  PODSUMOWANIE`);
  console.log(`${"=".repeat(60)}`);
  console.log(`  Potwierdzonych:       ${counts.OK}`);
  console.log(`  Poprawionych (typ):   ${counts.FIX}`);
  console.log(`  Usuniętych:           ${counts.DELETE}`);
  console.log(`  Pominiętych:          ${counts.SKIP}`);
  console.log(`  Wymaga OCR:           ${counts.NEEDS_OCR}`);
  console.log(`  Błędów:               ${counts.ERROR}`);

  if (!DO_RUN) {
    console.log(`\n  Uruchom z --run aby zastosować poprawki.\n`);
  }

  // Write CSV
  if (REPORT_FILE) {
    const csvLines = ["baseId;osoba;oldTyp;newTyp;action;reason"];
    for (const r of report) {
      csvLines.push(
        [r.baseId, r.osoba, r.oldTyp, r.newTyp ?? "", r.action, r.reason]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(";")
      );
    }
    fs.writeFileSync(REPORT_FILE, csvLines.join("\n"), "utf-8");
    console.log(`  Raport: ${REPORT_FILE}`);
  }

  console.log();
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    db.$disconnect();
    process.exit(1);
  });
