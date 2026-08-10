/**
 * Test text-layer parsing on a PDF file.
 * Usage: node scripts/test-parse-text.mjs <pdf-file>
 *
 * Shows: raw text from pdf-parse, then runs parseOswiadczenieText on it.
 */
import fs from "fs";
import path from "path";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/test-parse-text.mjs <pdf-file>");
  process.exit(1);
}

const filePath = path.resolve(file);
const buffer = fs.readFileSync(filePath);

console.log(`\nFile: ${filePath} (${(buffer.length / 1024).toFixed(0)} KB)\n`);

// Extract text
const pdfParse = (await import("pdf-parse")).default;
const pdfData = await pdfParse(buffer);
const text = pdfData.text;
const meaningful = text.replace(/\s/g, "").length;

console.log(`=== RAW TEXT (${text.length} chars, ${meaningful} meaningful) ===`);
console.log(text.substring(0, 2000));
if (text.length > 2000) console.log(`\n... [${text.length - 2000} more chars] ...`);
console.log(`\n=== END RAW TEXT ===\n`);

// Parse
const { parseOswiadczenieText } = await import("../src/lib/pdf-parser.ts");
const result = parseOswiadczenieText(text, path.basename(filePath));

console.log("=== PARSED RESULT ===");
console.log(JSON.stringify(result, null, 2));

// Check specific fields
console.log("\n=== FIELD CHECK ===");
const fields = ["detectedType", "imie", "nazwisko", "dataOd", "dataDo", "firma", "wynagrodzenie", "nrDecyzji", "nrOswiadczenia", "stanowisko"];
for (const f of fields) {
  const v = result[f];
  console.log(`  ${f}: ${v ?? "(EMPTY)"}`);
}
