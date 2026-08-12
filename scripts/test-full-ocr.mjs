/**
 * Full OCR pipeline test on a scanned PDF.
 * Usage: node scripts/test-full-ocr.mjs "docs/GP testy/Ivan Likho - decyzja - 2024-2027 (002).pdf"
 *
 * Tests: JPEG extraction → sharp rotation → Claude OCR structured extraction.
 * Requires ANTHROPIC_API_KEY in environment.
 */
import fs from "fs";
import zlib from "zlib";
import path from "path";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/test-full-ocr.mjs <pdf-file>");
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Set ANTHROPIC_API_KEY environment variable");
  process.exit(1);
}

const filePath = path.resolve(file);
const data = fs.readFileSync(filePath);
console.log(`\nFile: ${filePath} (${(data.length / 1024).toFixed(0)} KB)\n`);

// --- Extract JPEGs (same logic as extractJpegsFromPdf) ---
const SOI = Buffer.from([0xFF, 0xD8]);
const EOI = Buffer.from([0xFF, 0xD9]);
const jpegs = [];

// Pass 1: raw
let searchFrom = 0;
while (searchFrom < data.length - 2) {
  const soiIdx = data.indexOf(SOI, searchFrom);
  if (soiIdx === -1) break;
  const eoiIdx = data.indexOf(EOI, soiIdx + 2);
  if (eoiIdx === -1) break;
  const jpegEnd = eoiIdx + 2;
  if (jpegEnd - soiIdx > 10240) jpegs.push(data.subarray(soiIdx, jpegEnd));
  searchFrom = jpegEnd;
}
console.log(`Pass 1: ${jpegs.length} raw JPEGs`);

// Pass 2: FlateDecode (if no raw)
if (jpegs.length === 0) {
  console.log("Trying FlateDecode...");
  // ... (same as extractJpegsFromPdf)
}

if (jpegs.length === 0) {
  console.log("NO JPEGS FOUND. Cannot proceed.");
  process.exit(1);
}

// Sort by size, take first 2
jpegs.sort((a, b) => b.length - a.length);
const toProcess = jpegs.slice(0, 2);

// --- Rotate + OCR ---
const sharp = (await import("sharp")).default;
const Anthropic = (await import("@anthropic-ai/sdk")).default;
const client = new Anthropic();

for (let i = 0; i < toProcess.length; i++) {
  const jpeg = toProcess[i];
  const meta = await sharp(jpeg).metadata();
  console.log(`\nJPEG ${i + 1}: ${meta.width}x${meta.height} (${(jpeg.length / 1024).toFixed(0)} KB)`);

  let imgBuf = jpeg;
  if (meta.width > meta.height) {
    console.log("LANDSCAPE — rotating 90° CW...");
    imgBuf = await sharp(jpeg).rotate(90).jpeg({ quality: 85 }).toBuffer();
    const rotMeta = await sharp(imgBuf).metadata();
    console.log(`After rotation: ${rotMeta.width}x${rotMeta.height}`);
  }

  // OCR
  console.log("Sending to Claude OCR...");
  const base64 = imgBuf.toString("base64");
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
          { type: "text", text: `Przeanalizuj ten dokument i wyciagnij dane w formacie JSON.
UWAGA: Obraz moze byc OBROCONY.
Zwroc TYLKO JSON: { "detectedType": "KARTA_POBYTU"|"BLUE_CARD"|..., "imie": ..., "nazwisko": ..., "dataOd": "YYYY-MM-DD", "dataDo": "YYYY-MM-DD", "firma": ..., "stanowisko": ..., "wynagrodzenie": ..., "nrDecyzji": ... }` }
        ]
      }]
    });
    const text = response.content.filter(b => b.type === "text").map(b => b.text).join("");
    console.log(`\nOCR Response (page ${i + 1}):\n${text}\n`);
  } catch (e) {
    console.error(`OCR error: ${e.message}`);
  }
}

console.log("\n=== Test complete ===");
