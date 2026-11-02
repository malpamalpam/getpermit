import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const f = await db.fdkForeigner.findUnique({
    where: { id: 995 },
    include: {
      employmentBases: { orderBy: { id: "asc" } },
      attachments: { select: { id: true, nazwaPliku: true, typPliku: true } },
    },
  });
  if (!f) { console.log("Profil 995 nie istnieje"); return; }

  console.log(`Profil ${f.id}: ${f.imie ?? ""} ${f.nazwisko} | obyw=${f.obywatelstwo ?? "-"}`);
  console.log(`decyzjaPobytowaDo: ${f.decyzjaPobytowaDo?.toISOString().slice(0,10) ?? "null"}`);
  console.log(`typDokumentuPobytowego: "${f.typDokumentuPobytowego ?? "null"}"`);

  console.log(`\nPodstawy (${f.employmentBases.length}):`);
  for (const b of f.employmentBases) {
    console.log(`  #${b.id} ${b.typ} status=${b.status} od=${b.dataOd?.toISOString().slice(0,10) ?? "null"} do=${b.dataDo?.toISOString().slice(0,10) ?? "null"} nr=${b.nrDecyzji ?? "-"} src=${b.sourceAttachmentId ?? "-"}`);
  }

  console.log(`\nZałączniki (${f.attachments.length}):`);
  for (const a of f.attachments) {
    console.log(`  #${a.id} ${a.nazwaPliku} (${a.typPliku})`);
  }

  await db.$disconnect();
}
main().catch(console.error);
