import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const f = await db.fdkForeigner.findUnique({
    where: { id: 412 },
    include: {
      employmentBases: { orderBy: { id: "asc" } },
      attachments: { select: { id: true, nazwaPliku: true, typPliku: true } },
    },
  });
  if (!f) { console.log("Profil 412 nie istnieje"); return; }

  console.log(`Profil ${f.id}: ${f.imie ?? ""} ${f.nazwisko} | obyw=${f.obywatelstwo ?? "-"} | hidden=${f.hidden}`);
  console.log(`decyzjaPobytowaDo: ${f.decyzjaPobytowaDo?.toISOString().slice(0,10) ?? "null"}\n`);

  console.log(`Podstawy (${f.employmentBases.length}):`);
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
