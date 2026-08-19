/**
 * Import UPO MOS — wgraj PDF-y UPO i ustaw podstawę pobytową "W procedurze — przedłużenie TRC"
 *
 * Czyta _zestawienie_UPO.csv z folderu UPO MOS:
 *   Plik;Nadawca wg UPO;PESEL;Wojewoda;Data doręczenia;Weryfikacja
 *
 * Dla każdej osoby:
 *   1. Dopasowuje do profilu w bazie (nazwisko+imię, kontrolnie PESEL)
 *   2. Wgrywa PDF do załączników (kategoria "glowne", idempotentnie)
 *   3. Ustawia upoDoreczone + upoUwagi na profilu
 *   4. Loguje w historii zmian
 *
 * Usage:
 *   node scripts/import-upo-mos.mjs "C:\Users\gstep\Desktop\Cudzoziemcy ALl\UPO MOS" --dry-run
 *   node scripts/import-upo-mos.mjs "C:\Users\gstep\Desktop\Cudzoziemcy ALl\UPO MOS" --run --report raport-import-upo.csv
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
const CHANGED_BY = "import-upo-mos";

const args = process.argv.slice(2);
const sourceDir = args.find((a) => !a.startsWith("--"));
if (!sourceDir) {
  console.error("Usage: node scripts/import-upo-mos.mjs <folder-UPO-MOS> [--dry-run|--run] [--report plik.csv]");
  process.exit(1);
}

const DRY_RUN = !args.includes("--run");
const reportIdx = args.indexOf("--report");
const REPORT_FILE = reportIdx >= 0 ? args[reportIdx + 1] : null;

// ==================== NAME MATCHING ====================

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

function nameKey(tokens) {
  return tokens.join("|");
}

// ==================== CSV PARSING ====================

function parseCsv(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  // Header: Plik;Nadawca wg UPO;PESEL;Wojewoda;Data doręczenia;Weryfikacja
  const header = lines[0].split(";").map((h) => h.replace(/"/g, "").trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";").map((c) => c.replace(/"/g, "").trim());
    if (cols.length < 5) continue;
    rows.push({
      plik: cols[0],
      nadawca: cols[1],
      pesel: cols[2],
      wojewoda: cols[3],
      dataDoreczone: cols[4],
      weryfikacja: cols[5] ?? "",
    });
  }
  return rows;
}

function parseDate(dateStr) {
  // Try DD.MM.YYYY or DD/MM/YYYY or YYYY-MM-DD
  let m = dateStr.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
  m = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  return null;
}

function formatDate(d) {
  if (!d) return "—";
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

// ==================== MAIN ====================

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  IMPORT UPO MOS`);
  console.log(`  Źródło: ${sourceDir}`);
  console.log(`  Tryb: ${DRY_RUN ? "DRY-RUN" : "WYKONANIE"}`);
  console.log(`${"=".repeat(60)}\n`);

  // Find CSV
  const csvFile = fs.readdirSync(sourceDir).find((f) => f.endsWith(".csv"));
  if (!csvFile) {
    console.error("Nie znaleziono pliku CSV w folderze.");
    process.exit(1);
  }

  const csvPath = path.join(sourceDir, csvFile);
  console.log(`CSV: ${csvFile}`);
  const rows = parseCsv(csvPath);
  console.log(`Wierszy w CSV: ${rows.length}\n`);

  // Load all foreigners for matching
  const allForeigners = await db.fdkForeigner.findMany({
    select: { id: true, imie: true, nazwisko: true, pesel: true },
  });

  // Build lookup
  const foreignerMap = new Map();
  for (const f of allForeigners) {
    const fullName = `${f.imie ?? ""} ${f.nazwisko}`.trim();
    const tokens = normalizeNameTokens(fullName);
    const key = nameKey(tokens);
    if (!foreignerMap.has(key)) foreignerMap.set(key, []);
    foreignerMap.get(key).push(f);
  }

  // Load existing attachments for dedup
  const existingAttachments = await db.fdkAttachment.findMany({
    select: { foreignerId: true, nazwaPliku: true, rozmiarBytes: true },
  });
  const attachmentDedup = new Set();
  for (const a of existingAttachments) {
    attachmentDedup.add(`${a.foreignerId}|${a.nazwaPliku}|${a.rozmiarBytes}`);
  }

  const report = [];

  for (const row of rows) {
    const dataDoreczone = parseDate(row.dataDoreczone);
    if (!dataDoreczone) {
      console.log(`  [SKIP] Nie można sparsować daty: "${row.dataDoreczone}" — ${row.nadawca}`);
      report.push({ nadawca: row.nadawca, plik: row.plik, profilId: "", dopasowanie: "BLAD_DATY", dataDoreczone: row.dataDoreczone, utworzona: "NIE", uwagi: `Nieparsowalna data: ${row.dataDoreczone}` });
      continue;
    }

    // Parse name from nadawca (format: "Nazwisko Imie" or "Nazwisko Imie1 Imie2")
    const nadawcaTokens = normalizeNameTokens(row.nadawca);
    const key = nameKey(nadawcaTokens);

    // Try exact match
    let matches = foreignerMap.get(key) || [];

    // If no exact match, try subset
    if (matches.length === 0 && nadawcaTokens.length > 0) {
      for (const [k, foreigners] of foreignerMap.entries()) {
        const dbTokens = k.split("|");
        const aSubB = nadawcaTokens.every((t) => dbTokens.includes(t));
        const bSubA = dbTokens.every((t) => nadawcaTokens.includes(t));
        if (aSubB || bSubA) {
          matches.push(...foreigners);
        }
      }
    }

    // PESEL check
    if (row.pesel && matches.length > 1) {
      const peselMatch = matches.filter((m) => m.pesel === row.pesel);
      if (peselMatch.length > 0) matches = peselMatch;
    }

    if (matches.length === 0) {
      console.log(`  [MISS] Brak dopasowania: ${row.nadawca}`);
      report.push({ nadawca: row.nadawca, plik: row.plik, profilId: "", dopasowanie: "BRAK", dataDoreczone: formatDate(dataDoreczone), utworzona: "NIE", uwagi: "Nie znaleziono profilu" });
      continue;
    }

    if (matches.length > 1) {
      const ids = matches.map((m) => `id=${m.id} ${m.imie} ${m.nazwisko}`).join("; ");
      console.log(`  [AMBIG] Niejednoznaczne: ${row.nadawca} → ${ids}`);
      report.push({ nadawca: row.nadawca, plik: row.plik, profilId: ids, dopasowanie: "NIEJEDNOZNACZNE", dataDoreczone: formatDate(dataDoreczone), utworzona: "NIE", uwagi: `Wiele dopasowań: ${ids}` });
      continue;
    }

    const foreigner = matches[0];
    const personName = `${foreigner.imie ?? ""} ${foreigner.nazwisko}`.trim();

    // PESEL cross-check
    let peselNote = "";
    if (row.pesel && foreigner.pesel && row.pesel !== foreigner.pesel) {
      peselNote = `PESEL ROZBIEZNOSC: CSV=${row.pesel} vs DB=${foreigner.pesel}`;
      console.log(`  [WARN] ${personName}: ${peselNote}`);
    }

    console.log(`  [OK] ${row.nadawca} → id=${foreigner.id} ${personName} (${formatDate(dataDoreczone)})`);

    if (DRY_RUN) {
      report.push({ nadawca: row.nadawca, plik: row.plik, profilId: foreigner.id, dopasowanie: "OK", dataDoreczone: formatDate(dataDoreczone), utworzona: "DRY_RUN", uwagi: peselNote });
      continue;
    }

    // Upload PDF
    const pdfFileName = row.plik.endsWith(".pdf") ? row.plik : `${row.plik}.pdf`;
    const pdfPath = path.join(sourceDir, pdfFileName);
    let uploadOk = false;

    if (fs.existsSync(pdfPath)) {
      const fileBuffer = fs.readFileSync(pdfPath);
      const dedupKey = `${foreigner.id}|${pdfFileName}|${fileBuffer.length}`;

      if (attachmentDedup.has(dedupKey)) {
        console.log(`    [DEDUP] Plik już istnieje: ${pdfFileName}`);
        uploadOk = true; // already there
      } else {
        const safeName = pdfFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${foreigner.id}/${randomUUID()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, fileBuffer, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (uploadError) {
          console.error(`    [UPLOAD FAIL] ${pdfFileName}: ${uploadError.message}`);
        } else {
          await db.fdkAttachment.create({
            data: {
              foreignerId: foreigner.id,
              kategoria: "glowne",
              nazwaWyswietlana: `UPO MOS — ${personName}`,
              nazwaPliku: pdfFileName,
              opis: `UPO MOS doręczone ${formatDate(dataDoreczone)}, ${row.wojewoda}`,
              typPliku: "pdf",
              storagePath,
              rozmiarBytes: fileBuffer.length,
            },
          });
          attachmentDedup.add(dedupKey);
          uploadOk = true;
          console.log(`    [UPLOAD OK] ${pdfFileName}`);
        }
      }
    } else {
      console.log(`    [WARN] Plik nie istnieje: ${pdfPath}`);
    }

    // Set upoDoreczone + upoUwagi
    const upoUwagi = `Przedłużenie TRC — wniosek doręczony ${formatDate(dataDoreczone)}, ${row.wojewoda}`;
    await db.fdkForeigner.update({
      where: { id: foreigner.id },
      data: {
        upoDoreczone: dataDoreczone,
        upoUwagi,
      },
    });

    // Change log
    await db.fdkChangeLog.create({
      data: {
        foreignerId: foreigner.id,
        changedBy: CHANGED_BY,
        field: "upo_import",
        oldValue: null,
        newValue: `Import UPO MOS — podstawa pobytowa w procedurze. Doręczono: ${formatDate(dataDoreczone)}, ${row.wojewoda}.${uploadOk ? ` Załącznik: ${pdfFileName}` : ""}`,
      },
    });

    report.push({
      nadawca: row.nadawca,
      plik: row.plik,
      profilId: foreigner.id,
      dopasowanie: "OK",
      dataDoreczone: formatDate(dataDoreczone),
      utworzona: "TAK",
      uwagi: peselNote || (uploadOk ? "" : "Plik PDF nie znaleziony"),
    });
  }

  // Summary
  const counts = { OK: 0, BRAK: 0, NIEJEDNOZNACZNE: 0, BLAD_DATY: 0 };
  for (const r of report) counts[r.dopasowanie] = (counts[r.dopasowanie] ?? 0) + 1;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  PODSUMOWANIE`);
  console.log(`${"=".repeat(60)}`);
  console.log(`  Dopasowanych:        ${counts.OK ?? 0}`);
  console.log(`  Brak dopasowania:    ${counts.BRAK ?? 0}`);
  console.log(`  Niejednoznacznych:   ${counts.NIEJEDNOZNACZNE ?? 0}`);
  console.log(`  Błędy daty:          ${counts.BLAD_DATY ?? 0}`);

  if (DRY_RUN) console.log(`\n  Uruchom z --run aby zastosować.\n`);

  // Write CSV report
  if (REPORT_FILE) {
    const csvLines = ["nadawca;plik;profil_id;dopasowanie;data_doreczone;utworzona;uwagi"];
    for (const r of report) {
      csvLines.push(
        [r.nadawca, r.plik, r.profilId, r.dopasowanie, r.dataDoreczone, r.utworzona, r.uwagi]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(";")
      );
    }
    fs.writeFileSync(REPORT_FILE, csvLines.join("\n"), "utf-8");
    console.log(`  Raport: ${REPORT_FILE}`);
  }

  console.log();
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  db.$disconnect();
  process.exit(1);
});
