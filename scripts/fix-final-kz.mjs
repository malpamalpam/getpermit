/**
 * Final fixes from K-Z audit:
 * 1. Unhide 2 profiles matched from CSV
 * 2. Swap imię↔nazwisko in profile 863 (Piashko Lizaveta)
 * 3. Deactivate base #2111 in profile 986 (Sobolev — cudzy dokument)
 */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const CHANGED_BY = "fix-final-kz";

async function main() {
  // 1. Unhide 2 profiles from hidden-candidates report
  const hiddenCandidates = [
    // From raport-match-v2-hidden-candidates.csv — fill in actual IDs
  ];

  // Read the CSV to get actual profile IDs
  const fs = await import("fs");
  const csvPath = "raport-match-v2-hidden-candidates.csv";
  if (fs.existsSync(csvPath)) {
    const lines = fs.readFileSync(csvPath, "utf-8").split(/\r?\n/).filter(l => l.trim());
    for (const line of lines.slice(1)) {
      const match = line.match(/;(\d+);/);
      if (match) hiddenCandidates.push(parseInt(match[1]));
    }
  }

  console.log(`\n=== 1. Odkrywanie ${hiddenCandidates.length} profili ===\n`);
  for (const pid of hiddenCandidates) {
    const f = await db.fdkForeigner.findUnique({ where: { id: pid }, select: { id: true, nazwisko: true, imie: true, hidden: true } });
    if (!f) continue;
    console.log(`  Profil ${pid} (${f.imie ?? ""} ${f.nazwisko}): hidden=${f.hidden} → false`);
    await db.fdkForeigner.update({ where: { id: pid }, data: { hidden: false } });
    await db.fdkChangeLog.create({
      data: { foreignerId: pid, changedBy: CHANGED_BY, field: "hidden", oldValue: "true", newValue: "false (zmatchowany z CSV aktywnych)" },
    });
  }

  // 2. Swap imię↔nazwisko in profile 863
  console.log(`\n=== 2. Profil 863: zamiana imię↔nazwisko ===\n`);
  const p863 = await db.fdkForeigner.findUnique({ where: { id: 863 }, select: { id: true, imie: true, nazwisko: true } });
  if (p863) {
    console.log(`  PRZED: imię="${p863.imie}", nazwisko="${p863.nazwisko}"`);
    await db.fdkForeigner.update({ where: { id: 863 }, data: { imie: p863.nazwisko, nazwisko: p863.imie ?? "" } });
    await db.fdkChangeLog.create({
      data: { foreignerId: 863, changedBy: CHANGED_BY, field: "swap_imie_nazwisko",
        oldValue: `imię="${p863.imie}", nazwisko="${p863.nazwisko}"`,
        newValue: `imię="${p863.nazwisko}", nazwisko="${p863.imie}" (odwrócone pola)` },
    });
    console.log(`  PO: imię="${p863.nazwisko}", nazwisko="${p863.imie}"`);
  }

  // 3. Deactivate base #2111 in profile 986 (cudzy dokument Sobolevej)
  console.log(`\n=== 3. Profil 986: dezaktywacja podstawy #2111 (cudzy dokument) ===\n`);
  const b2111 = await db.fdkEmploymentBase.findUnique({ where: { id: 2111 } });
  if (b2111) {
    console.log(`  #2111 ${b2111.typ} status=${b2111.status} → NIEAKTYWNE`);
    await db.fdkEmploymentBase.update({ where: { id: 2111 }, data: { status: "NIEAKTYWNE" } });
    await db.fdkChangeLog.create({
      data: { foreignerId: 986, changedBy: CHANGED_BY, field: "deactivate_cudzy_dokument",
        oldValue: `#2111 ${b2111.typ} ${b2111.status}`,
        newValue: `→ NIEAKTYWNE (dokument SOBOLEVA_YELENA dotyczy profilu 985, nie 986)` },
    });
  }

  console.log(`\nGotowe.\n`);
  await db.$disconnect();
}

main().catch(console.error);
