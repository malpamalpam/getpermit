import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const candidates = await db.fdkForeigner.findMany({
    where: { nazwisko: { contains: "Nichol", mode: "insensitive" } },
    include: {
      employmentBases: { orderBy: { id: "asc" } },
      attachments: { select: { id: true, nazwaPliku: true } },
    },
  });

  for (const f of candidates) {
    console.log(`Profil ${f.id}: ${f.imie ?? ""} ${f.nazwisko} | obyw=${f.obywatelstwo ?? "-"} | hidden=${f.hidden}`);
    for (const b of f.employmentBases) {
      console.log(`  #${b.id} ${b.typ} status=${b.status} od=${b.dataOd?.toISOString().slice(0,10) ?? "null"} do=${b.dataDo?.toISOString().slice(0,10) ?? "null"}`);
    }
    for (const a of f.attachments) {
      console.log(`  att #${a.id}: ${a.nazwaPliku}`);
    }
  }

  if (candidates.length === 0) console.log("Nie znaleziono Nicols.");
  await db.$disconnect();
}
main().catch(console.error);
