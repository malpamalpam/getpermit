import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // Check current state of profile 358
  const f = await db.fdkForeigner.findUnique({
    where: { id: 358 },
    select: { id: true, imie: true, nazwisko: true, decyzjaPobytowaDo: true, typDokumentuPobytowego: true },
  });
  console.log(`Profil 358: ${f.imie} ${f.nazwisko}`);
  console.log(`  decyzjaPobytowaDo: ${f.decyzjaPobytowaDo?.toISOString().slice(0,10) ?? "null"}`);
  console.log(`  typDokumentuPobytowego: ${f.typDokumentuPobytowego ?? "null"}`);

  // The "Przegląd" tab shows decyzjaPobytowaDo and typDokumentuPobytowego
  // For rezydent UE: bezterminowy (null), typ = "Rezydent długoterminowy UE"
  await db.fdkForeigner.update({
    where: { id: 358 },
    data: {
      typDokumentuPobytowego: "Rezydent długoterminowy UE (art. 211)",
      decyzjaPobytowaDo: null, // bezterminowy
    },
  });
  console.log(`\n  → typDokumentuPobytowego = "Rezydent długoterminowy UE (art. 211)"`);
  console.log(`  → decyzjaPobytowaDo = null (bezterminowy)`);

  // Also fix #445 TRC_FDK which has same nr as rezydent — should be WYGASLE
  const b445 = await db.fdkEmploymentBase.findUnique({ where: { id: 445 } });
  if (b445 && b445.foreignerId === 358 && b445.typ === "TRC_FDK") {
    console.log(`\n  #445 TRC_FDK status=${b445.status} → WYGASLE (zastąpiony przez rezydenta UE)`);
    await db.fdkEmploymentBase.update({ where: { id: 445 }, data: { status: "WYGASLE" } });
    await db.fdkChangeLog.create({
      data: {
        foreignerId: 358, changedBy: "fix-358-overview",
        field: "fix_trc_to_wygasle",
        oldValue: `#445 TRC_FDK ${b445.status}`,
        newValue: "→ WYGASLE (zastąpiony przez OD_REZYDENT_UE #3411)",
      },
    });
  }

  // Show final active
  console.log("\n=== Aktywne podstawy ===\n");
  const active = await db.fdkEmploymentBase.findMany({
    where: { foreignerId: 358, status: "AKTYWNE" },
    orderBy: { id: "asc" },
  });
  for (const b of active) {
    console.log(`  #${b.id} ${b.typ} od=${b.dataOd?.toISOString().slice(0,10) ?? "null"} do=${b.dataDo?.toISOString().slice(0,10) ?? "null"}`);
  }

  await db.$disconnect();
}
main().catch(console.error);
