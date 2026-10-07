import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const CHANGED_BY = "fix-412";

async function main() {
  console.log("=== Profil 412 (Rodrigo Arenas Catalán) — dodaję OD_REZYDENT_UE ===\n");

  // 1. Create OD_REZYDENT_UE base
  const existing = await db.fdkEmploymentBase.findFirst({
    where: { foreignerId: 412, typ: "OD_REZYDENT_UE" },
  });
  if (existing) {
    console.log(`  Już istnieje #${existing.id} — pomijam tworzenie`);
  } else {
    const base = await db.fdkEmploymentBase.create({
      data: {
        foreignerId: 412,
        typ: "OD_REZYDENT_UE",
        status: "AKTYWNE",
        dataOd: new Date("2026-07-29"),
        dataDo: null, // bezterminowy
        nrDecyzji: "SC-V.6153.1.1332.2026",
        sourceAttachmentId: 3661, // Rodrigo Arenas Catalán.pdf
      },
    });
    console.log(`  Utworzono #${base.id} OD_REZYDENT_UE od=2026-07-29 nr=SC-V.6153.1.1332.2026`);

    await db.fdkChangeLog.create({
      data: {
        foreignerId: 412, changedBy: CHANGED_BY, field: "scrape",
        oldValue: null,
        newValue: `Utworzono podstawę #${base.id} (OD_REZYDENT_UE) z decyzji Wojewody Małopolskiego z 29.07.2026`,
      },
    });
  }

  // 2. Expire old TRC bases that are superseded by rezydent
  const oldActive = await db.fdkEmploymentBase.findMany({
    where: { foreignerId: 412, status: "AKTYWNE", typ: { in: ["TRC_FDK", "KARTA_POBYTU"] } },
  });
  for (const b of oldActive) {
    console.log(`  #${b.id} ${b.typ} status=AKTYWNE → WYGASLE (zastąpiony przez rezydenta UE)`);
    await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { status: "WYGASLE" } });
  }

  // 3. Update foreigner overview
  await db.fdkForeigner.update({
    where: { id: 412 },
    data: {
      typDokumentuPobytowego: "Rezydent długoterminowy UE (art. 211)",
      decyzjaPobytowaDo: null, // bezterminowy
    },
  });
  console.log(`  typDokumentuPobytowego → "Rezydent długoterminowy UE (art. 211)"`);
  console.log(`  decyzjaPobytowaDo → null (bezterminowy)`);

  // Show final active
  console.log("\n=== Aktywne podstawy ===\n");
  const active = await db.fdkEmploymentBase.findMany({
    where: { foreignerId: 412, status: "AKTYWNE" },
    orderBy: { id: "asc" },
  });
  for (const b of active) {
    console.log(`  #${b.id} ${b.typ} od=${b.dataOd?.toISOString().slice(0,10) ?? "null"} do=${b.dataDo?.toISOString().slice(0,10) ?? "null"} nr=${b.nrDecyzji ?? "-"}`);
  }

  await db.$disconnect();
}
main().catch(console.error);
