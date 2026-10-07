/**
 * Fix 2099-12-31 and 2625-10-25 sentinel dates.
 *
 * These were set by rescrape-all-v2 for indefinite permits (pobyt stały, rezydent UE, uchodźca).
 * The correct representation is dataDo=null (not 2099).
 *
 * For decyzjaPobytowaDo on foreigner: set to null (indefinite = no expiry).
 * For base dataDo=2625: clearly a parsing error → null.
 */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const CHANGED_BY = "fix-2099";

async function main() {
  // 1. Fix decyzjaPobytowaDo = 2099 or 2625
  console.log("=== Fix decyzjaPobytowaDo ===\n");
  const profiles = await db.fdkForeigner.findMany({
    where: { decyzjaPobytowaDo: { gte: new Date("2099-01-01") } },
    select: { id: true, nazwisko: true, imie: true, decyzjaPobytowaDo: true },
  });

  for (const p of profiles) {
    const old = p.decyzjaPobytowaDo?.toISOString().slice(0, 10);
    console.log(`  profil ${p.id} (${p.imie ?? ""} ${p.nazwisko}): ${old} → null`);
    await db.fdkForeigner.update({ where: { id: p.id }, data: { decyzjaPobytowaDo: null } });
    await db.fdkChangeLog.create({
      data: {
        foreignerId: p.id, changedBy: CHANGED_BY, field: "decyzjaPobytowaDo",
        oldValue: old, newValue: "null (bezterminowy pobyt — sentinel 2099 usunięty)",
      },
    });
  }
  console.log(`\n  Naprawiono: ${profiles.length} profili\n`);

  // 2. Fix base dataDo = 2625 (profil 464)
  console.log("=== Fix base dataDo ===\n");
  const badBases = await db.fdkEmploymentBase.findMany({
    where: { dataDo: { gte: new Date("2099-01-01") } },
    include: { foreigner: { select: { id: true, nazwisko: true, imie: true } } },
  });

  for (const b of badBases) {
    const old = b.dataDo?.toISOString().slice(0, 10);
    console.log(`  profil ${b.foreigner.id} (${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}) #${b.id} ${b.typ}: dataDo=${old} → null`);
    await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { dataDo: null } });
    await db.fdkChangeLog.create({
      data: {
        foreignerId: b.foreigner.id, changedBy: CHANGED_BY, field: "fix_dataDo_sentinel",
        oldValue: `#${b.id} dataDo=${old}`, newValue: "null (sentinel/parsing error usunięty)",
      },
    });
  }
  console.log(`\n  Naprawiono: ${badBases.length} podstaw\n`);

  // 3. Fix profil 341: deduplikacja OD_REZYDENT_UE (3 identyczne)
  console.log("=== Fix profil 341: deduplikacja 3x OD_REZYDENT_UE ===\n");
  const dupes = await db.fdkEmploymentBase.findMany({
    where: { foreignerId: 341, typ: "OD_REZYDENT_UE" },
    orderBy: { id: "asc" },
  });
  if (dupes.length > 1) {
    const keep = dupes[0];
    for (const d of dupes.slice(1)) {
      console.log(`  Usuwam duplikat #${d.id} (zachowuję #${keep.id})`);
      await db.fdkEmploymentBase.delete({ where: { id: d.id } });
    }
    await db.fdkChangeLog.create({
      data: {
        foreignerId: 341, changedBy: CHANGED_BY, field: "dedup_rezydent",
        oldValue: `${dupes.length}x OD_REZYDENT_UE`, newValue: `Zachowano #${keep.id}, usunięto ${dupes.slice(1).map(d => `#${d.id}`).join(", ")}`,
      },
    });
  }

  // 4. Verify
  console.log("\n=== Weryfikacja ===\n");
  const check341 = await db.fdkForeigner.findUnique({ where: { id: 341 }, select: { decyzjaPobytowaDo: true } });
  console.log(`  profil 341 decyzjaPobytowaDo: ${check341?.decyzjaPobytowaDo ?? "null"} ✓`);

  const remaining2099 = await db.fdkForeigner.count({ where: { decyzjaPobytowaDo: { gte: new Date("2099-01-01") } } });
  console.log(`  Profile z decyzjaPobytowaDo >= 2099: ${remaining2099}`);

  const remainingBases2099 = await db.fdkEmploymentBase.count({ where: { dataDo: { gte: new Date("2099-01-01") } } });
  console.log(`  Podstawy z dataDo >= 2099: ${remainingBases2099}`);

  console.log("\nGotowe.");
  await db.$disconnect();
}
main().catch(console.error);
