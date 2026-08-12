/**
 * Diagnostic script: test JPEG extraction from a PDF file.
 * Usage: node scripts/test-jpeg-extract.mjs "docs/GP testy/Ivan Likho - decyzja - 2024-2027 (002).pdf"
 *
 * This tests the same extractJpegsFromPdf logic used in pdf-parser.ts
 * WITHOUT calling Claude API — just checks if we can find and rotate JPEGs.
 */
import fs from "fs";
import zlib from "zlib";
import path from "path";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/test-jpeg-extract.mjs <pdf-file>");
  process.exit(1);
}

const filePath = path.resolve(file);
console.log(`\n=== JPEG Extraction Diagnostic ===`);
console.log(`File: ${filePath}`);
console.log(`Size: ${(fs.statSync(filePath).size / 1024).toFixed(0)} KB\n`);

const data = fs.readFileSync(filePath);

// --- Pass 1: Raw JPEG markers ---
console.log("--- Pass 1: Scanning for raw JPEG SOI/EOI markers ---");
const SOI = Buffer.from([0xFF, 0xD8]);
const EOI = Buffer.from([0xFF, 0xD9]);
const MIN_SIZE = 10 * 1024;
const rawJpegs = [];

let searchFrom = 0;
while (searchFrom < data.length - 2) {
  const soiIdx = data.indexOf(SOI, searchFrom);
  if (soiIdx === -1) break;

  const eoiIdx = data.indexOf(EOI, soiIdx + 2);
  if (eoiIdx === -1) break;

  const jpegEnd = eoiIdx + 2;
  const jpegSize = jpegEnd - soiIdx;

  if (jpegSize > MIN_SIZE) {
    rawJpegs.push({ offset: soiIdx, size: jpegSize, data: data.subarray(soiIdx, jpegEnd) });
    console.log(`  Found raw JPEG at offset ${soiIdx}: ${(jpegSize / 1024).toFixed(0)} KB`);
  } else {
    console.log(`  Skipped small JPEG at offset ${soiIdx}: ${jpegSize} bytes`);
  }
  searchFrom = jpegEnd;
}
console.log(`Pass 1 result: ${rawJpegs.length} raw JPEGs found\n`);

// --- Pass 2: FlateDecode streams ---
console.log("--- Pass 2: Scanning for FlateDecode-compressed streams ---");
const streamMarker = Buffer.from("stream\n");
const streamMarkerCRLF = Buffer.from("stream\r\n");
const endstreamMarker = Buffer.from("\nendstream");
const endstreamMarkerCR = Buffer.from("\r\nendstream");
const flatJpegs = [];

let pos = 0;
let attempts = 0;
let zlibStreams = 0;
while (pos < data.length && attempts < 100) {
  let streamStart = data.indexOf(streamMarkerCRLF, pos);
  let markerLen = streamMarkerCRLF.length;
  if (streamStart === -1) {
    streamStart = data.indexOf(streamMarker, pos);
    markerLen = streamMarker.length;
  }
  if (streamStart === -1) break;

  const dataStart = streamStart + markerLen;
  let streamEnd = data.indexOf(endstreamMarkerCR, dataStart);
  if (streamEnd === -1) streamEnd = data.indexOf(endstreamMarker, dataStart);
  if (streamEnd === -1) { pos = dataStart + 1; continue; }

  const streamData = data.subarray(dataStart, streamEnd);
  pos = streamEnd + 10;

  if (streamData.length < 1000) continue;
  attempts++;

  // Check context: look back 200 chars for /Filter hints
  const contextStart = Math.max(0, streamStart - 300);
  const context = data.subarray(contextStart, streamStart).toString("ascii", 0, undefined).replace(/[\x00-\x1f]/g, " ");
  const hasDCT = context.includes("DCTDecode");
  const hasFlate = context.includes("FlateDecode");
  const hasImage = context.includes("/Image") || context.includes("/XObject");

  // Check for zlib magic bytes
  const isZlib = streamData.length >= 2 && streamData[0] === 0x78 && [0x01, 0x5E, 0x9C, 0xDA].includes(streamData[1]);
  // Check for raw JPEG
  const isRawJpeg = streamData.length >= 2 && streamData[0] === 0xFF && streamData[1] === 0xD8;

  if (streamData.length > 5000) {
    console.log(`  Stream #${attempts} at offset ${dataStart}: ${(streamData.length / 1024).toFixed(0)} KB | zlib=${isZlib} rawJpeg=${isRawJpeg} | DCT=${hasDCT} Flate=${hasFlate} Image=${hasImage}`);
  }

  if (isRawJpeg && streamData.length > MIN_SIZE) {
    // Find actual EOI within stream
    const eoi = streamData.lastIndexOf(EOI);
    if (eoi > 0) {
      const jpeg = streamData.subarray(0, eoi + 2);
      flatJpegs.push({ offset: dataStart, size: jpeg.length, data: jpeg, source: "raw-in-stream" });
      console.log(`    → Extracted raw JPEG from stream: ${(jpeg.length / 1024).toFixed(0)} KB`);
    }
  }

  if (isZlib && streamData.length > 5000) {
    zlibStreams++;
    try {
      const decompressed = zlib.inflateSync(streamData);
      console.log(`    → Decompressed: ${(decompressed.length / 1024).toFixed(0)} KB`);

      if (decompressed.length > MIN_SIZE && decompressed[0] === 0xFF && decompressed[1] === 0xD8) {
        flatJpegs.push({ offset: dataStart, size: decompressed.length, data: decompressed, source: "flate-decompressed" });
        console.log(`    → JPEG found after decompression! ${(decompressed.length / 1024).toFixed(0)} KB`);
      }
    } catch (e) {
      // not valid zlib — skip
    }
  }
}
console.log(`Pass 2 result: ${attempts} streams examined, ${zlibStreams} zlib streams, ${flatJpegs.length} JPEGs found\n`);

// --- Combine results ---
const allJpegs = [...rawJpegs, ...flatJpegs];
console.log(`=== TOTAL: ${allJpegs.length} JPEG images found ===\n`);

if (allJpegs.length === 0) {
  console.log("❌ NO JPEGs EXTRACTED — this is the root cause of the 422 error.");
  console.log("The extractJpegsFromPdf function returns empty array → no images to rotate → no OCR → 422.");
  console.log("\nNext step: check PDF structure manually. Run:");
  console.log('  node -e "const d=require(\'fs\').readFileSync(process.argv[1]).toString(\'ascii\');console.log([...d.matchAll(/\\/Filter\\s*[\\[\\s]*([^\\]\\n]+)/g)].map(m=>m[0]+\' at \'+m.index))" "' + file + '"');
  process.exit(1);
}

// --- Test sharp rotation ---
console.log("--- Testing sharp rotation ---");
try {
  const sharp = (await import("sharp")).default;

  for (let i = 0; i < Math.min(allJpegs.length, 3); i++) {
    const jpeg = allJpegs[i];
    try {
      const meta = await sharp(jpeg.data).metadata();
      console.log(`  JPEG ${i + 1} (${jpeg.source ?? "pass1"}): ${meta.width}x${meta.height} ${meta.width > meta.height ? "LANDSCAPE" : "portrait"}`);

      if (meta.width > meta.height) {
        const rotated = await sharp(jpeg.data).rotate(90).jpeg({ quality: 85 }).toBuffer();
        const rotMeta = await sharp(rotated).metadata();
        console.log(`    → Rotated 90°: ${rotMeta.width}x${rotMeta.height} (${(rotated.length / 1024).toFixed(0)} KB) ✓`);

        // Save first rotated image for visual inspection
        const outPath = `test-rotated-page${i + 1}.jpg`;
        fs.writeFileSync(outPath, rotated);
        console.log(`    → Saved to ${outPath} for visual inspection`);
      }
    } catch (e) {
      console.log(`  JPEG ${i + 1}: sharp failed — ${e.message}`);
    }
  }
} catch (e) {
  console.log(`❌ sharp import failed: ${e.message}`);
}

console.log("\n=== Diagnostic complete ===");
