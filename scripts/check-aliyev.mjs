import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // Find Aliyev
  const candidates = await db.fdkForeigner.findMany({
    where: { nazwisko: { contains: "Aliyev", mode: "insensitive" } },
    include: {
      employmentBases: { orderBy: { id: "asc" } },
      attachments: { select: { id: true, nazwaPliku: true, typPliku: true, storagePath: true } },
    },
  });

  for (const f of candidates) {
    console.log(`\nProfil ${f.id}: ${f.imie ?? ""} ${f.nazwisko} | hidden=${f.hidden}`);
    console.log(`  decyzjaPobytowaDo: ${f.decyzjaPobytowaDo?.toISOString().slice(0,10) ?? "null"}`);

    console.log(`\n  Podstawy (${f.employmentBases.length}):`);
    for (const b of f.employmentBases) {
      console.log(`    #${b.id} ${b.typ} status=${b.status} od=${b.dataOd?.toISOString().slice(0,10) ?? "null"} do=${b.dataDo?.toISOString().slice(0,10) ?? "null"} nr=${b.nrDecyzji ?? "-"} source=${b.sourceAttachmentId ?? "-"}`);
    }

    console.log(`\n  Załączniki (${f.attachments.length}):`);
    for (const a of f.attachments) {
      console.log(`    #${a.id} ${a.nazwaPliku} (${a.typPliku})`);
    }
  }

  if (candidates.length === 0) {
    console.log("Nie znaleziono profilu Aliyev. Szukam Murad...");
    const byImie = await db.fdkForeigner.findMany({
      where: { imie: { contains: "Murad", mode: "insensitive" } },
      select: { id: true, imie: true, nazwisko: true },
    });
    for (const f of byImie) console.log(`  ${f.id}: ${f.imie} ${f.nazwisko}`);
  }

  await db.$disconnect();
}
main().catch(console.error);
