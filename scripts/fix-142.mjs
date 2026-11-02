import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const f = await db.fdkForeigner.findUnique({
    where: { id: 142 },
    include: { employmentBases: { orderBy: { id: "asc" } } },
  });
  console.log(`Profil ${f.id}: ${f.imie ?? ""} ${f.nazwisko}\n`);
  console.log(`Podstawy:`);
  for (const b of f.employmentBases) {
    console.log(`  #${b.id} ${b.typ} status=${b.status} od=${b.dataOd?.toISOString().slice(0,10) ?? "null"} do=${b.dataDo?.toISOString().slice(0,10) ?? "null"} nr=${b.nrDecyzji ?? b.nrOswiadczenia ?? "-"}`);
  }

  // Find and remove OD_REZYDENT_UE bases (wrongly assigned)
  const rezydent = f.employmentBases.filter(b => b.typ === "OD_REZYDENT_UE");
  if (rezydent.length > 0) {
    console.log(`\nUsuwam ${rezydent.length} błędnych OD_REZYDENT_UE:`);
    for (const b of rezydent) {
      console.log(`  USUWAM #${b.id}`);
      await db.fdkEmploymentBase.delete({ where: { id: b.id } });
    }
    await db.fdkChangeLog.create({
      data: { foreignerId: 142, changedBy: "fix-142", field: "delete_false_rezydent",
        oldValue: rezydent.map(b => `#${b.id} OD_REZYDENT_UE`).join(", "),
        newValue: "USUNIĘTO — nie jest rezydentem UE, jest na karcie pobytu" },
    });

    // Reset decyzjaPobytowaDo (was null from 2099 fix)
    // Find latest valid TRC/KARTA dataDo
    const validBases = f.employmentBases.filter(b =>
      !["OD_REZYDENT_UE"].includes(b.typ) && b.dataDo && b.status === "AKTYWNE"
    );
    const latestDo = validBases.length > 0
      ? validBases.sort((a, b) => b.dataDo.getTime() - a.dataDo.getTime())[0].dataDo
      : null;

    await db.fdkForeigner.update({ where: { id: 142 }, data: { decyzjaPobytowaDo: latestDo } });
    console.log(`  decyzjaPobytowaDo → ${latestDo?.toISOString().slice(0,10) ?? "null"}`);
  } else {
    console.log("\nBrak OD_REZYDENT_UE do usunięcia.");
  }

  // Show final
  console.log("\n=== Stan końcowy ===\n");
  const final = await db.fdkEmploymentBase.findMany({
    where: { foreignerId: 142 }, orderBy: { id: "asc" },
    select: { id: true, typ: true, status: true, dataOd: true, dataDo: true, nrDecyzji: true, nrOswiadczenia: true },
  });
  for (const b of final) {
    console.log(`  #${b.id} ${b.typ} status=${b.status} od=${b.dataOd?.toISOString().slice(0,10) ?? "null"} do=${b.dataDo?.toISOString().slice(0,10) ?? "null"} nr=${b.nrDecyzji ?? b.nrOswiadczenia ?? "-"}`);
  }

  await db.$disconnect();
}
main().catch(console.error);
