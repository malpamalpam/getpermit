import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // === 1. Aliyev (358) — dodaj OD_REZYDENT_UE z OCR ===
  console.log("=== Profil 358 (Aliyev) — dodaję OD_REZYDENT_UE ===\n");

  const existing = await db.fdkEmploymentBase.findFirst({
    where: { foreignerId: 358, typ: "OD_REZYDENT_UE" },
  });
  if (existing) {
    console.log(`  Już istnieje #${existing.id} — pomijam`);
  } else {
    const base = await db.fdkEmploymentBase.create({
      data: {
        foreignerId: 358,
        typ: "OD_REZYDENT_UE",
        status: "AKTYWNE",
        dataOd: new Date("2025-07-08"),
        dataDo: null, // bezterminowy
        nrDecyzji: "SC-II.6153.639.2025",
        sourceAttachmentId: 711,
      },
    });
    console.log(`  Utworzono #${base.id} OD_REZYDENT_UE od=2025-07-08 nr=SC-II.6153.639.2025`);

    await db.fdkChangeLog.create({
      data: {
        foreignerId: 358, changedBy: "scrape-358",
        field: "scrape",
        oldValue: null,
        newValue: `Utworzono podstawę #${base.id} (OD_REZYDENT_UE) z pliku: Aliyev_Murad_decyzja (REZYDENT UE) od 08.07.2025.pdf`,
      },
    });

    // Update foreigner
    await db.fdkForeigner.update({
      where: { id: 358 },
      data: { decyzjaPobytowaDo: null }, // bezterminowy
    });
    console.log(`  decyzjaPobytowaDo → null (bezterminowy)`);
  }

  // === 2. Szukam Nichols ===
  console.log("\n=== Szukam Joseph Nichols ===\n");

  const nichols = await db.fdkForeigner.findMany({
    where: {
      OR: [
        { nazwisko: { contains: "Nichols", mode: "insensitive" } },
        { nazwisko: { contains: "Nicols", mode: "insensitive" } },
        { imie: { contains: "Joseph", mode: "insensitive" }, nazwisko: { contains: "Nich", mode: "insensitive" } },
      ],
    },
    include: {
      employmentBases: { select: { id: true, typ: true, status: true, dataOd: true, dataDo: true } },
    },
  });

  if (nichols.length === 0) {
    // Broader search
    const joseph = await db.fdkForeigner.findMany({
      where: { imie: { contains: "Joseph", mode: "insensitive" } },
      select: { id: true, imie: true, nazwisko: true, obywatelstwo: true },
    });
    console.log(`  Nie znaleziono Nichols. Josephs w bazie:`);
    for (const j of joseph) {
      console.log(`    ${j.id}: ${j.imie} ${j.nazwisko} (${j.obywatelstwo ?? "-"})`);
    }
  } else {
    for (const f of nichols) {
      console.log(`  Profil ${f.id}: ${f.imie ?? ""} ${f.nazwisko} | obyw=${f.obywatelstwo ?? "-"} | hidden=${f.hidden}`);
      for (const b of f.employmentBases) {
        console.log(`    #${b.id} ${b.typ} status=${b.status}`);
      }
    }
  }

  // === Verify 358 final state ===
  console.log("\n=== Stan końcowy profilu 358 ===\n");
  const final = await db.fdkForeigner.findUnique({
    where: { id: 358 },
    include: { employmentBases: { orderBy: { id: "asc" }, select: { id: true, typ: true, status: true, dataOd: true, dataDo: true, nrDecyzji: true } } },
  });
  console.log(`decyzjaPobytowaDo: ${final.decyzjaPobytowaDo?.toISOString().slice(0,10) ?? "null"}`);
  for (const b of final.employmentBases) {
    console.log(`  #${b.id} ${b.typ} status=${b.status} od=${b.dataOd?.toISOString().slice(0,10) ?? "null"} do=${b.dataDo?.toISOString().slice(0,10) ?? "null"} nr=${b.nrDecyzji ?? "-"}`);
  }

  await db.$disconnect();
}
main().catch(console.error);
