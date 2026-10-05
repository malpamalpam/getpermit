/**
 * Check specific profiles from K-Z audit.
 */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // Check swap candidates: profiles 52, 119, 305, 180
  console.log("=== SWAP CANDIDATES ===\n");
  for (const id of [52, 119, 305, 180]) {
    const f = await db.fdkForeigner.findUnique({
      where: { id },
      include: { employmentBases: { orderBy: { id: "asc" } } },
    });
    if (!f) { console.log(`Profile ${id}: NOT FOUND`); continue; }
    console.log(`Profile ${id}: ${f.imie ?? ""} ${f.nazwisko}`);
    for (const b of f.employmentBases) {
      console.log(`  #${b.id} ${b.typ} | status=${b.status} | od=${b.dataOd?.toISOString().slice(0,10) ?? "null"} | do=${b.dataDo?.toISOString().slice(0,10) ?? "null"} | nr=${b.nrDecyzji ?? b.nrOswiadczenia ?? "-"}`);
    }
    console.log("");
  }

  // Check junk nr candidates: profiles 77, 78, 79, 91, 100, 118, 119, 122, 131
  console.log("=== JUNK NR CANDIDATES ===\n");
  for (const id of [77, 78, 79, 91, 100, 118, 119, 122, 131]) {
    const f = await db.fdkForeigner.findUnique({
      where: { id },
      select: { id: true, nazwisko: true, imie: true, nrPaszportu: true },
    });
    if (!f) continue;
    const bases = await db.fdkEmploymentBase.findMany({
      where: { foreignerId: id },
      select: { id: true, nrDecyzji: true, nrOswiadczenia: true, typ: true },
    });
    console.log(`Profile ${id}: ${f.imie ?? ""} ${f.nazwisko} | paszport="${f.nrPaszportu ?? "null"}"`);
    for (const b of bases) {
      if (b.nrDecyzji) console.log(`  #${b.id} ${b.typ} nrDecyzji="${b.nrDecyzji}"`);
      if (b.nrOswiadczenia) console.log(`  #${b.id} ${b.typ} nrOsw="${b.nrOswiadczenia}"`);
    }
    console.log("");
  }

  await db.$disconnect();
}

main().catch(console.error);
