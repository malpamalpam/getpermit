import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
const db = new PrismaClient();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const f = await db.fdkForeigner.findUnique({
    where: { id: 358 },
    include: {
      employmentBases: { orderBy: { id: "asc" } },
      attachments: { select: { id: true, nazwaPliku: true, typPliku: true, storagePath: true } },
    },
  });

  if (!f) { console.log("Profil 358 nie istnieje"); return; }

  console.log(`Profil 358: ${f.imie ?? ""} ${f.nazwisko}`);
  console.log(`decyzjaPobytowaDo: ${f.decyzjaPobytowaDo?.toISOString().slice(0,10) ?? "null"}`);
  console.log(`hidden: ${f.hidden}`);

  console.log(`\nPodstawy (${f.employmentBases.length}):`);
  for (const b of f.employmentBases) {
    console.log(`  #${b.id} ${b.typ} status=${b.status} od=${b.dataOd?.toISOString().slice(0,10) ?? "null"} do=${b.dataDo?.toISOString().slice(0,10) ?? "null"} nr=${b.nrDecyzji ?? "-"} src=${b.sourceAttachmentId ?? "-"}`);
  }

  console.log(`\nZałączniki (${f.attachments.length}):`);
  for (const a of f.attachments) {
    console.log(`  #${a.id} "${a.nazwaPliku}" (${a.typPliku}) path=${a.storagePath}`);
  }

  // Try to parse unscraped attachments
  const scrapedAttIds = new Set(f.employmentBases.map(b => b.sourceAttachmentId).filter(Boolean));
  const unscraped = f.attachments.filter(a => !scrapedAttIds.has(a.id) && a.typPliku === "pdf");

  if (unscraped.length > 0) {
    console.log(`\nNIEZESCRAPOWANE załączniki PDF:`);
    for (const a of unscraped) {
      console.log(`  #${a.id} "${a.nazwaPliku}"`);
      // Try to parse
      try {
        const { data } = await supabase.storage.from("fdk-attachments").download(a.storagePath);
        if (!data) { console.log("    → nie można pobrać"); continue; }
        const buffer = await data.arrayBuffer();
        const pdfParse = (await import("pdf-parse")).default;
        const pdf = await pdfParse(Buffer.from(buffer));
        const text = (pdf.text ?? "").substring(0, 500);
        console.log(`    → tekst (${pdf.text?.length ?? 0} znaków): ${text.replace(/\s+/g, " ").substring(0, 200)}...`);
        // Check for rezydent keywords
        if (/rezydent|211|218|długoterminow|pobyt.*stał/i.test(pdf.text ?? "")) {
          console.log(`    → ZAWIERA słowa kluczowe rezydenta!`);
        }
      } catch (e) { console.log(`    → błąd: ${e.message}`); }
    }
  }

  await db.$disconnect();
}
main().catch(console.error);
