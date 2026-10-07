import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  for (const id of [142, 633]) {
    const f = await db.fdkForeigner.findUnique({
      where: { id },
      include: {
        employmentBases: { orderBy: { id: "asc" } },
        attachments: { select: { id: true, nazwaPliku: true, typPliku: true } },
      },
    });
    if (!f) { console.log(`Profil ${id}: NIE ISTNIEJE\n`); continue; }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`Profil ${id}: ${f.imie ?? ""} ${f.nazwisko} | obyw=${f.obywatelstwo ?? "-"}`);
    console.log(`${"=".repeat(60)}`);

    console.log(`\nPodstawy (${f.employmentBases.length}):`);
    for (const b of f.employmentBases) {
      console.log(`  #${b.id} ${b.typ} status=${b.status} od=${b.dataOd?.toISOString().slice(0,10) ?? "null"} do=${b.dataDo?.toISOString().slice(0,10) ?? "null"} nr=${b.nrDecyzji ?? b.nrOswiadczenia ?? "-"}`);
    }

    console.log(`\nZałączniki (${f.attachments.length}):`);
    for (const a of f.attachments) {
      console.log(`  #${a.id} ${a.nazwaPliku} (${a.typPliku})`);
    }
  }
  await db.$disconnect();
}
main().catch(console.error);
