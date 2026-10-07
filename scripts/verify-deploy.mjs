/**
 * Verify production state: check specific profiles and bases.
 */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  console.log("=== VERIFICATION SELECT-y na produkcyjnej bazie ===\n");

  // 1. Profile 199, 221 (odkryte w fix-final-kz), 349, 50
  for (const id of [199, 221, 349, 50, 863, 986]) {
    const f = await db.fdkForeigner.findUnique({
      where: { id },
      select: { id: true, imie: true, nazwisko: true, hidden: true, updatedAt: true },
    });
    if (!f) { console.log(`Profil ${id}: NIE ISTNIEJE`); continue; }
    console.log(`Profil ${id}: ${f.imie ?? ""} ${f.nazwisko} | hidden=${f.hidden} | updated=${f.updatedAt.toISOString()}`);
  }

  // 2. Base #2111
  console.log("");
  const b2111 = await db.fdkEmploymentBase.findUnique({
    where: { id: 2111 },
    select: { id: true, foreignerId: true, typ: true, status: true, nrDecyzji: true, updatedAt: true },
  });
  if (b2111) {
    console.log(`Podstawa #2111: foreignerId=${b2111.foreignerId} typ=${b2111.typ} status=${b2111.status} nr=${b2111.nrDecyzji} updated=${b2111.updatedAt.toISOString()}`);
  } else {
    console.log(`Podstawa #2111: NIE ISTNIEJE`);
  }

  // 3. Recent change logs
  console.log("\n=== Ostatnie logi zmian (fix-final-kz) ===\n");
  const logs = await db.fdkChangeLog.findMany({
    where: { changedBy: "fix-final-kz" },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  for (const l of logs) {
    console.log(`  ${l.createdAt.toISOString()} | profil ${l.foreignerId} | ${l.field}: ${l.oldValue} → ${l.newValue}`);
  }

  await db.$disconnect();
}

main().catch(console.error);
