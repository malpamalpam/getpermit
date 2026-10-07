import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const bases = await db.fdkEmploymentBase.findMany({
    where: { foreignerId: 142 },
    orderBy: { id: "asc" },
  });

  console.log(`Profil 142 — wszystkie podstawy (${bases.length}):\n`);
  for (const b of bases) {
    console.log(`#${b.id} ${b.typ}`);
    console.log(`  status=${b.status}`);
    console.log(`  od=${b.dataOd?.toISOString().slice(0,10) ?? "null"} do=${b.dataDo?.toISOString().slice(0,10) ?? "null"}`);
    console.log(`  nr=${b.nrDecyzji ?? "-"} osw=${b.nrOswiadczenia ?? "-"}`);
    console.log(`  firma=${b.firma ?? "-"} stanowisko=${b.stanowisko ?? "-"}`);
    console.log(`  wynagrodzenie=${b.wynagrodzenie ?? "-"} umowa=${b.rodzajUmowy ?? "-"}`);
    console.log(`  src=${b.sourceAttachmentId ?? "-"}`);
    console.log("");
  }

  await db.$disconnect();
}
main().catch(console.error);
