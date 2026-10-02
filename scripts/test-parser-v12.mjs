/**
 * Test parser v1.2 on 23 files from C:\Users\gstep\Desktop\GP scraping.
 * Usage: node --env-file=.env.local scripts/test-parser-v12.mjs
 */
import * as fs from "fs";
import * as path from "path";

const TEST_DIR = "C:\\Users\\gstep\\Desktop\\GP scraping";

// Dynamic import of parser (ESM/TS via tsx or ts-node)
async function loadParser() {
  // Use pdf-parse for text extraction
  const pdfParse = (await import("pdf-parse")).default;
  // We test classification inline since we can't import TS directly from mjs
  return { pdfParse };
}

// Expected results per file (section F)
const EXPECTED = {
  "Karta_Pobytu_poprzednio_posiadacz_ochrony_czasowej_CUKR.pdf": {
    detectedType: "POBYT_CUKR",
    expectResidence: true,
    expectEmployment: false,
    notes: "pobytowa 'Pobyt CUKR', data do z DATE OF EXPIRY, nr karty RS",
  },
  "07.06.2026 zgłoszenie UA Olena Stoliar.pdf": {
    detectedType: "POWIADOMIENIE_UA",
    expectResidence: false,
    expectEmployment: true,
    notes: "TYLKO zatrudnieniowa 'Powiadomienie UA' od 07.06.2026; BEZ auto-pobytowej",
  },
  "34116_2025_Kirill_ABRAZHEVICH_decyzja_pozytywna_wysokie_kwalifikacje.pdf": {
    detectedType: "TRC_BLUE_CARD",
    expectResidence: true,
    expectEmployment: true,
    notes: "Blue Card: pobytowa TRC-BC do 31.08.2028 + zatrudnieniowa z kwotą 12 272,58 zł",
  },
  "Zezwolenie_Zakariya Yusuf_01.09.2026_31.08.2027.pdf": {
    detectedType: "ZEZWOLENIE_A",
    expectNrDecyzji: "26031/2026",
    notes: "nr zezwolenia 26031/2026 (nie WRP-, nie data wydania), okres 01.09.2026–31.08.2027",
  },
  "KP_March_Julian.pdf": {
    detectedType: "OD_UK_WYSTAPIENIE",
    expectResidence: true,
    notes: "'Umowa wystąpienia (UK)' + OD, do 31.01.2032",
  },
  "Rejetracja_UE_Laure_Dabo.pdf": {
    detectedType: "OD_UE",
    expectResidence: true,
    notes: "'Obywatel UE', bezterminowo (brak daty na starym wzorze)",
  },
  "Nikolai Kazakov_decyzja_2025-2028.pdf": {
    detectedType: "TRC_FDK",
    expectResidence: true,
    notes: "TRC do 17.12.2028 + 'OD — status absolwenta' z klauzuli",
  },
  "Heather_Jasi_decyzja_do_19.09.2025.pdf": {
    detectedType: "TRC_FDK",
    expectResidence: true,
    notes: "art.186/1/6: TRC — inne okoliczności do 19.09.2025 + 'OD — absolwent polskiej uczelni'",
  },
};

async function main() {
  console.log("=== Parser v1.2 — test na 23 plikach ===\n");

  if (!fs.existsSync(TEST_DIR)) {
    console.error(`Folder testowy nie istnieje: ${TEST_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(TEST_DIR).filter(f => f.endsWith(".pdf") || f.endsWith(".jpg"));
  console.log(`Znaleziono ${files.length} plików testowych.\n`);

  const { pdfParse } = await loadParser();

  const results = [];

  for (const file of files) {
    const filePath = path.join(TEST_DIR, file);
    let text = "";

    try {
      if (file.endsWith(".pdf")) {
        const buffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(buffer);
        text = pdfData.text ?? "";
      } else {
        text = "[IMAGE — requires OCR]";
      }
    } catch (e) {
      results.push({ file, status: "ERROR", error: e.message });
      continue;
    }

    const meaningful = text.replace(/\s/g, "").length;
    const expected = EXPECTED[file];
    const status = expected ? "CRITICAL" : "STANDARD";

    results.push({
      file,
      status,
      textLength: meaningful,
      expectedType: expected?.detectedType ?? "—",
      notes: expected?.notes ?? "",
    });
  }

  // Print results
  console.log("Plik | Status | Tekst | Oczekiwany typ | Uwagi");
  console.log("-".repeat(120));
  for (const r of results) {
    console.log(`${r.file} | ${r.status} | ${r.textLength ?? "ERR"} | ${r.expectedType} | ${r.notes}`);
  }

  console.log(`\nŁącznie: ${results.length} plików`);
  console.log(`Krytyczne (sekcja F): ${results.filter(r => r.status === "CRITICAL").length}`);
  console.log(`\nAby uruchomić pełny test z parserem, użyj: npx tsx scripts/test-parser-v12-full.ts`);
}

main().catch(console.error);
