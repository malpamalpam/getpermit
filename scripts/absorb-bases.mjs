/**
 * Wchłanianie: aktywna decyzja pobytowa (KARTA_POBYTU/BLUE_CARD) z prawem do pracy
 * wchłania wcześniejsze WP/OŚW o pokrywających się okresach → oznacz jako NIEAKTYWNE.
 *
 * Reguła: jeśli osoba ma AKTYWNE KARTA_POBYTU lub BLUE_CARD, to ZEZWOLENIE/OSWIADCZENIE
 * z dataDo <= dataDo karty pobytu (lub bez dataDo) zostaje NIEAKTYWNE.
 *
 * node scripts/absorb-bases.mjs          # dry run
 * node scripts/absorb-bases.mjs --apply  # apply
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const DO_APPLY = process.argv.includes("--apply");

function computeStatus(base) {
  if (base.status === "UCHYLONE" || base.status === "UMORZONE") return base.status;
  if (base.status === "NIEAKTYWNE" && base.dataZakPracy) return "NIEAKTYWNE";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (base.dataZakPracy) {
    const zak = new Date(base.dataZakPracy.getFullYear(), base.dataZakPracy.getMonth(), base.dataZakPracy.getDate());
    if (zak <= today) return "NIEAKTYWNE";
  }
  const dataOd = base.dataOd ? new Date(base.dataOd.getFullYear(), base.dataOd.getMonth(), base.dataOd.getDate()) : null;
  const dataDo = base.dataDo ? new Date(base.dataDo.getFullYear(), base.dataDo.getMonth(), base.dataDo.getDate()) : null;
  if (dataDo && dataDo < today) return "WYGASLE";
  if (dataOd && dataOd <= today && (!dataDo || dataDo >= today)) return "AKTYWNE";
  if (dataOd && dataOd > today) return "W_TRAKCIE";
  return "BRAK_DANYCH";
}

async function main() {
  console.log(`Tryb: ${DO_APPLY ? "APPLY" : "DRY RUN"}\n`);

  const foreigners = await db.fdkForeigner.findMany({
    include: {
      employmentBases: { orderBy: { dataDo: "desc" } },
    },
  });

  const ABSORB_TYPES = ["ZEZWOLENIE", "OSWIADCZENIE"];
  const RESIDENCE_TYPES = ["KARTA_POBYTU", "BLUE_CARD"];
  let totalAbsorbed = 0;
  const changes = [];

  for (const f of foreigners) {
    // Recompute statuses
    const bases = f.employmentBases.map((b) => ({ ...b, status: computeStatus(b) }));

    // Find active residence permit
    const activeResidence = bases.find(
      (b) => RESIDENCE_TYPES.includes(b.typ) && b.status === "AKTYWNE"
    );
    if (!activeResidence) continue;

    // Also check UPO or ochronaCzasowaUkr as absorbing
    const hasResidenceCover =
      activeResidence ||
      f.upoDoreczone ||
      f.ochronaCzasowaUkr;
    if (!hasResidenceCover) continue;

    const resDo = activeResidence?.dataDo;

    // Find WP/OŚW to absorb
    for (const b of bases) {
      if (!ABSORB_TYPES.includes(b.typ)) continue;
      if (b.status !== "AKTYWNE" && b.status !== "BRAK_DANYCH") continue;

      // Absorb if: WP/OŚW dataDo <= residence dataDo, or WP/OŚW has no dataDo
      const shouldAbsorb = !b.dataDo || (resDo && b.dataDo <= resDo);
      if (!shouldAbsorb) continue;

      changes.push({
        foreignerId: f.id,
        name: `${f.imie} ${f.nazwisko}`,
        baseId: b.id,
        typ: b.typ,
        status: b.status,
        period: `${b.dataOd?.toISOString().slice(0, 10) ?? "?"}-${b.dataDo?.toISOString().slice(0, 10) ?? "?"}`,
        residenceId: activeResidence.id,
        residenceDo: resDo?.toISOString().slice(0, 10) ?? "?",
      });

      if (DO_APPLY) {
        // Only update if actual DB status is AKTYWNE or BRAK_DANYCH
        const current = f.employmentBases.find((x) => x.id === b.id);
        if (current && (current.status === "AKTYWNE" || current.status === "BRAK_DANYCH")) {
          await db.fdkEmploymentBase.update({
            where: { id: b.id },
            data: { status: "NIEAKTYWNE" },
          });
          await db.fdkChangeLog.create({
            data: {
              foreignerId: f.id,
              changedBy: "absorb-bases",
              field: "employment_base_auto",
              oldValue: current.status,
              newValue: `Podstawa #${b.id} (${b.typ}) wchłonięta przez decyzję pobytową #${activeResidence.id} (${activeResidence.typ} do ${resDo?.toISOString().slice(0, 10)})`,
            },
          });
        }
      }
      totalAbsorbed++;
    }
  }

  console.log(`Wchłoniętych: ${totalAbsorbed}\n`);

  // Group by person
  const byPerson = {};
  for (const c of changes) {
    const key = `${c.foreignerId}:${c.name}`;
    if (!byPerson[key]) byPerson[key] = [];
    byPerson[key].push(c);
  }

  for (const [key, items] of Object.entries(byPerson)) {
    console.log(`${key}:`);
    for (const c of items) {
      console.log(`  #${c.baseId} ${c.typ} ${c.status} ${c.period} → NIEAKTYWNE (wchł. przez #${c.residenceId} do ${c.residenceDo})`);
    }
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
