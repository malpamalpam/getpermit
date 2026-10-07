import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
const db = new PrismaClient();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Scrape attachment #3661 (newest, likely rezydent UE decision)
  const att = await db.fdkAttachment.findUnique({ where: { id: 3661 } });
  if (!att) { console.log("Załącznik #3661 nie istnieje"); return; }
  console.log(`Scrapuję: #${att.id} "${att.nazwaPliku}"\n`);

  const { data } = await supabase.storage.from("fdk-attachments").download(att.storagePath);
  if (!data) { console.log("Nie można pobrać"); return; }
  const buffer = await data.arrayBuffer();

  const pdfParse = (await import("pdf-parse")).default;
  const pdf = await pdfParse(Buffer.from(buffer));
  const text = (pdf.text ?? "").replace(/\s+/g, " ").trim();
  const meaningful = text.replace(/\s/g, "").length;

  console.log(`Tekst: ${meaningful} znaków`);
  if (meaningful > 50) {
    console.log(`Fragment: ${text.substring(0, 300)}...\n`);
    // Check for rezydent keywords
    if (/rezydent|211|218|długoterminow|pobyt.*stał/i.test(text)) {
      console.log("→ ZAWIERA słowa kluczowe rezydenta UE!\n");
    }
  } else {
    console.log("→ Skan bez tekstu, wymagana OCR\n");
    // Try OCR
    const { parseOswiadczeniePdf } = await import("../src/lib/pdf-parser.ts");
    const result = await parseOswiadczeniePdf(buffer, { ocrFallback: true, filename: att.nazwaPliku });
    if (result) {
      console.log(`OCR typ: ${result.detectedType}`);
      console.log(`OCR od: ${result.dataOd ?? "null"}`);
      console.log(`OCR do: ${result.dataDo ?? "null"}`);
      console.log(`OCR nr: ${result.nrDecyzji ?? "-"}`);
    }
  }

  await db.$disconnect();
}
main().catch(console.error);
