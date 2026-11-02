/**
 * Pkt 4: Fill empty TRC-FDK employment base fields from residence base data.
 * Pkt 5: Mark work permits as absorbed by TRC when same employer+position.
 *
 * Usage:
 *   node scripts/fix-trc-fdk-and-absorb.mjs            # dry-run
 *   node scripts/fix-trc-fdk-and-absorb.mjs --apply     # apply
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");

function norm(s) {
  return (s ?? "").toLowerCase().replace(/[^a-ząćęłńóśźżа-яіїєґ0-9]/g, " ").replace(/\s+/g, " ").trim();
}

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  // === Pkt 4: Fill TRC-FDK empty fields ===
  console.log("=== PKT 4: Uzupełnianie pól TRC-FDK z podstaw pobytu ===\n");

  const trcFdkBases = await db.fdkEmploymentBase.findMany({
    where: { typ: { in: ["TRC_FDK", "TRC_BLUE_CARD", "TRC_INNY_PRACODAWCA", "TRC_STUDIA", "TRC_POBYT_Z_CUDZ", "TRC_MALZONEK_PL", "TRC_HUMANITARNE", "TRC_ABSOLWENT", "TRC_DZIALALNOSC", "TRC_INNE_OKOLICZNOSCI"] } },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true } } },
  });

  const resBases = await db.fdkResidenceBasis.findMany({
    where: { status: { not: "NIEAKTYWNE" } },
  });

  // Index residence bases by foreignerId
  const resByForeigner = new Map();
  for (const rb of resBases) {
    if (!resByForeigner.has(rb.foreignerId)) resByForeigner.set(rb.foreignerId, []);
    resByForeigner.get(rb.foreignerId).push(rb);
  }

  let filledCount = 0;

  for (const eb of trcFdkBases) {
    if (eb.status === "NIEAKTYWNE") continue;
    const fRes = resByForeigner.get(eb.foreignerId) || [];

    // Find matching residence base by nrDecyzji or type
    let matchRes = null;
    if (eb.nrDecyzji) {
      matchRes = fRes.find(r => r.nrDecyzji === eb.nrDecyzji);
    }
    if (!matchRes) {
      matchRes = fRes.find(r => r.typ === eb.typ && r.status !== "NIEAKTYWNE");
    }

    const updates = {};
    // Fill empty dataOd from residence base
    if (!eb.dataOd && matchRes?.dataOd) updates.dataOd = matchRes.dataOd;
    // Fill empty nrDecyzji
    if (!eb.nrDecyzji && matchRes?.nrDecyzji) updates.nrDecyzji = matchRes.nrDecyzji;
    // Fill empty urzad (field doesn't exist on employment base but uwagi can hold it)

    if (Object.keys(updates).length === 0) continue;

    filledCount++;
    const profile = `${eb.foreigner.imie ?? ""} ${eb.foreigner.nazwisko}`.trim();
    console.log(`  [FILL] #${eb.id} ${eb.typ} profil=${profile} (#${eb.foreignerId})`);
    for (const [k, v] of Object.entries(updates)) {
      const val = v instanceof Date ? v.toISOString().slice(0, 10) : v;
      console.log(`    ${k}: (puste) → ${val}`);
    }

    if (APPLY) {
      await db.fdkEmploymentBase.update({ where: { id: eb.id }, data: updates });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: eb.foreignerId,
          changedBy: "fix-trc-fdk-fields",
          field: "employment_base_fill",
          oldValue: `#${eb.id} ${eb.typ} brakujące pola`,
          newValue: `Uzupełniono: ${Object.entries(updates).map(([k,v]) => `${k}=${v instanceof Date ? v.toISOString().slice(0,10) : v}`).join(", ")}`,
        },
      });
    }
  }
  console.log(`\nUzupełnione TRC-FDK: ${filledCount}\n`);

  // === Pkt 5: Absorption — TRC absorbs work permits with same employer+position ===
  console.log("=== PKT 5: Absorpcja zezwoleń przez TRC ===\n");

  // Get all active employment bases grouped by foreigner
  const allBases = await db.fdkEmploymentBase.findMany({
    where: { status: { notIn: ["NIEAKTYWNE"] } },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true } } },
    orderBy: [{ foreignerId: "asc" }, { dataOd: "desc" }],
  });

  const byForeigner = new Map();
  for (const b of allBases) {
    if (!byForeigner.has(b.foreignerId)) byForeigner.set(b.foreignerId, []);
    byForeigner.get(b.foreignerId).push(b);
  }

  let absorbedCount = 0;

  for (const [foreignerId, bases] of byForeigner) {
    // Find TRC bases (active or wygasłe)
    const trcBases = bases.filter(b =>
      b.typ.startsWith("TRC_") && b.status !== "NIEAKTYWNE" && b.dataOd
    );
    // Find work permits (ZEZWOLENIE_A, ZEZWOLENIE_A_KONT)
    const wpBases = bases.filter(b =>
      (b.typ === "ZEZWOLENIE_A" || b.typ === "ZEZWOLENIE_A_KONT") && b.status !== "NIEAKTYWNE" && b.status !== "UCHYLONE" && b.status !== "UMORZONE"
    );

    for (const wp of wpBases) {
      for (const trc of trcBases) {
        // Check if TRC started after or on wp start → wp is absorbed from TRC.dataOd
        if (!trc.dataOd) continue;

        // Compare employer (by name normalization)
        const sameEmployer = norm(trc.firma) && norm(wp.firma) && norm(trc.firma) === norm(wp.firma);
        // Compare position
        const samePosition = norm(trc.stanowisko) && norm(wp.stanowisko) && norm(trc.stanowisko) === norm(wp.stanowisko);

        if (!sameEmployer || !samePosition) continue;

        // TRC must have started during or after the wp period
        const trcStart = trc.dataOd.getTime();
        const wpStart = wp.dataOd ? wp.dataOd.getTime() : 0;
        const wpEnd = wp.dataDo ? wp.dataDo.getTime() : Infinity;

        if (trcStart < wpStart || trcStart > wpEnd) continue;

        // WP should be absorbed
        const profile = `${bases[0].foreigner.imie ?? ""} ${bases[0].foreigner.nazwisko}`.trim();
        const trcDate = trc.dataOd.toISOString().slice(0, 10);
        console.log(`  [ABSORB] WP #${wp.id} (${wp.typ}) → wchłonięte przez TRC #${trc.id} (${trc.typ}) od ${trcDate} — profil ${profile} (#${foreignerId})`);
        console.log(`    Firma: ${wp.firma || "-"}`);
        console.log(`    Stanowisko: ${(wp.stanowisko || "-").slice(0, 60)}`);

        absorbedCount++;

        if (APPLY) {
          await db.fdkEmploymentBase.update({
            where: { id: wp.id },
            data: {
              status: "NIEAKTYWNE",
              uwagi: `Wchłonięte przez ${trc.typ} #${trc.id} (od ${trcDate})`,
            },
          });
          await db.fdkChangeLog.create({
            data: {
              foreignerId,
              changedBy: "absorb-wp-by-trc",
              field: "employment_base_absorbed",
              oldValue: `WP #${wp.id} (${wp.typ}) ${wp.status}`,
              newValue: `Wchłonięte przez ${trc.typ} #${trc.id} od ${trcDate}`,
            },
          });
        }
        break; // Don't absorb same WP by multiple TRCs
      }
    }
  }

  console.log(`\nWchłonięte zezwolenia: ${absorbedCount}`);
  if (!APPLY && (filledCount > 0 || absorbedCount > 0)) {
    console.log("Uruchom z --apply żeby zastosować.");
  }
}

main().then(() => db.$disconnect()).catch(e => { console.error(e); db.$disconnect(); process.exit(1); });
