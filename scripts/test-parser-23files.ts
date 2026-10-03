import * as fs from "fs";
import * as path from "path";
import { parseOswiadczenieText, parseOswiadczeniePdf } from "../src/lib/pdf-parser";

const DIR = "C:\\Users\\gstep\\Desktop\\GP scraping";

async function main() {
  const pdfParse = (await import("pdf-parse")).default;
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".pdf") || f.endsWith(".jpg"));

  console.log(`\n=== Test parsera v1.2 na ${files.length} plikach (z OCR) ===\n`);
  console.log("PLIK | TYP | OD | DO | NR | WYN | FLAGI");
  console.log("-".repeat(130));

  for (const file of files) {
    const filePath = path.join(DIR, file);
    try {
      const buf = fs.readFileSync(filePath);

      if (file.endsWith(".jpg")) {
        // Image — use OCR directly
        const result = await parseOswiadczeniePdf(buf.buffer, { ocrFallback: true, filename: file });
        const flags = [
          result.dataOdManualFlag ? "MANUAL_OD" : "",
          result.lowConfidence ? "LOW_CONF" : "",
        ].filter(Boolean).join(",") || "-";
        console.log(
          `${file} | ${result.detectedType || "?"} | ${result.dataOd || "-"} | ${result.dataDo || "-"} | ${result.nrDecyzji || result.nrOswiadczenia || "-"} | ${result.wynagrodzenie || "-"} | ${flags} [OCR]`
        );
        continue;
      }

      // PDF — try text first, fall back to OCR
      const pdf = await pdfParse(buf);
      const text = pdf.text || "";
      const meaningful = text.replace(/\s/g, "").length;

      if (meaningful >= 50) {
        const result = parseOswiadczenieText(text, file);
        const flags = [
          result.dataOdManualFlag ? "MANUAL_OD" : "",
          result.lowConfidence ? "LOW_CONF" : "",
        ].filter(Boolean).join(",") || "-";
        console.log(
          `${file} | ${result.detectedType || "?"} | ${result.dataOd || "-"} | ${result.dataDo || "-"} | ${result.nrDecyzji || result.nrOswiadczenia || "-"} | ${result.wynagrodzenie || "-"} | ${flags}`
        );
      } else {
        // Scanned PDF — use OCR
        console.log(`  [OCR] ${file}...`);
        const result = await parseOswiadczeniePdf(buf.buffer, { ocrFallback: true, filename: file });
        const flags = [
          result.dataOdManualFlag ? "MANUAL_OD" : "",
          result.lowConfidence ? "LOW_CONF" : "",
        ].filter(Boolean).join(",") || "-";
        console.log(
          `${file} | ${result.detectedType || "?"} | ${result.dataOd || "-"} | ${result.dataDo || "-"} | ${result.nrDecyzji || result.nrOswiadczenia || "-"} | ${result.wynagrodzenie || "-"} | ${flags} [OCR]`
        );
      }
    } catch (e: any) {
      console.log(`${file} | ERROR: ${e.message.slice(0, 100)}`);
    }
  }
  console.log("");
}

main();
