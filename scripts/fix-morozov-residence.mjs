/**
 * Fix Morozov residence bases: hide junk TRC_FDK entries that override Blue Card.
 *
 * Residence bases #9, #11, #12, #16 are TRC_FDK created from procedural docs.
 * They should be NIEAKTYWNE — Blue Card #1 is the correct one.
 * Also hide duplicate #10 (same sygnatura as #1).
 * Also hide #19 TRC_INNY_PRACODAWCA from ZUS.
 *
 * Usage:
 *   node scripts/fix-morozov-residence.mjs          # dry-run
 *   node scripts/fix-morozov-residence.mjs --apply  # apply
 */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  const all = await db.fdkResidenceBasis.findMany({
    where: { foreignerId: 28 },
    include: { foreigner: { select: { nazwisko: true, imie: true } } },
    orderBy: { id: "asc" },
  });

  console.log(`Morozov: ${all.length} residence bases\n`);

  // Keep #1 (TRC_BLUE_CARD, correct decision) and #2 (TRC_INNY_PRACODAWCA, older decision)
  // Hide everything else
  const keepIds = new Set([1, 2]);
  let hidden = 0;

  for (const rb of all) {
    if (keepIds.has(rb.id)) {
      console.log(`  [KEEP] #${rb.id} ${rb.typ} ${rb.status} ${rb.nrDecyzji || "(brak nr)"} ${rb.dataOd?.toISOString().slice(0, 10) || "-"}–${rb.dataDo?.toISOString().slice(0, 10) || "-"}`);
      continue;
    }
    if (rb.status === "NIEAKTYWNE") {
      console.log(`  [SKIP] #${rb.id} ${rb.typ} — already NIEAKTYWNE`);
      continue;
    }

    const reason = rb.id === 10 ? "duplikat #1 (ta sama sygnatura)"
      : rb.id === 9 ? "TRC_FDK z aneksu (nr 1/07/2026)"
      : rb.id === 11 ? "TRC_FDK z uzupełnienia (nr umowy, nie decyzji)"
      : rb.id === 12 ? "TRC_FDK z nr WRP (to zezwolenie na pracę, nie TRC)"
      : rb.id === 16 ? "TRC_FDK bez nr i bez dataDo"
      : rb.id === 19 ? "TRC_INNY_PRACODAWCA z ZUS"
      : "śmieciowa podstawa pobytu";

    console.log(`  [HIDE] #${rb.id} ${rb.typ} ${rb.status}: ${reason}`);
    hidden++;

    if (APPLY) {
      await db.fdkResidenceBasis.update({ where: { id: rb.id }, data: { status: "NIEAKTYWNE" } });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: 28,
          changedBy: "fix-morozov-residence",
          field: "res_hidden",
          oldValue: `#${rb.id} ${rb.typ} ${rb.status}`,
          newValue: `Ukryto: ${reason}`,
        },
      });
    }
  }

  console.log(`\nUkryte: ${hidden}`);
  if (!APPLY && hidden > 0) console.log("Uruchom z --apply żeby zastosować.");
}

main().catch(console.error).finally(() => db.$disconnect());
