/**
 * Skrypt naprawczy 21.09.2026 — pkt 4b, 5b, skan TRC, skan UUID.
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-21-09-data.mjs
 *   node --env-file=.env.local scripts/fix-21-09-data.mjs --run --report raport-fix-21-09.csv
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient();
const CHANGED_BY = "fix-21-09-script";

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");
const reportIdx = args.indexOf("--report");
const REPORT_FILE = reportIdx >= 0 ? args[reportIdx + 1] : null;

const csvRows = [["action", "baseId", "foreignerId", "nazwisko", "field", "oldValue", "newValue"]];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}/i;
const HASH_PATTERN = /^[0-9a-f]{20,}/i;

async function main() {
  console.log(`=== Fix 21.09 data (${DO_RUN ? "RUN" : "DRY-RUN"}) ===\n`);

  const allBases = await db.fdkEmploymentBase.findMany({
    include: { foreigner: true },
  });

  // === Pkt 4b: UUID w nrOswiadczenia/nrDecyzji ===
  console.log("--- UUID cleanup ---");
  let uuidFixed = 0;
  for (const b of allBases) {
    const fields = [
      { key: "nrOswiadczenia", val: b.nrOswiadczenia },
      { key: "nrDecyzji", val: b.nrDecyzji },
    ];
    for (const f of fields) {
      if (f.val && (UUID_PATTERN.test(f.val) || HASH_PATTERN.test(f.val))) {
        const name = `${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}`.trim();
        console.log(`  [UUID ${b.id}] ${name}: ${f.key}="${f.val.substring(0, 40)}..." → NULL`);
        if (DO_RUN) {
          await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { [f.key]: null } });
          await db.fdkChangeLog.create({ data: { foreignerId: b.foreignerId, changedBy: CHANGED_BY, field: f.key, oldValue: f.val, newValue: null } });
        }
        uuidFixed++;
        csvRows.push(["uuid_cleanup", String(b.id), String(b.foreignerId), b.foreigner.nazwisko, f.key, f.val.substring(0, 60), "NULL"]);
      }
    }
  }
  console.log(`UUID: ${uuidFixed} naprawione\n`);

  // === Pkt 5b: Borzdov 92 — Zezwolenie A #506 bez źródła ===
  console.log("--- Borzdov 92: Zezwolenie A #506 ---");
  const base506 = allBases.find(b => b.id === 506);
  if (base506) {
    console.log(`  [${base506.id}] typ=${base506.typ} nrDecyzji=${base506.nrDecyzji ?? "BRAK"} sourceAttachmentId=${base506.sourceAttachmentId ?? "BRAK"}`);
    if (!base506.nrDecyzji && !base506.sourceAttachmentId) {
      console.log(`  → USUŃ (brak nr decyzji i źródła)`);
      if (DO_RUN) {
        await db.fdkEmploymentBase.delete({ where: { id: 506 } });
        await db.fdkChangeLog.create({ data: { foreignerId: base506.foreignerId, changedBy: CHANGED_BY, field: "employment_base_delete", oldValue: `#506 ${base506.typ}`, newValue: "Usunięty — brak źródła i nr decyzji" } });
      }
      csvRows.push(["delete_no_source", "506", String(base506.foreignerId), base506.foreigner.nazwisko, "base", base506.typ, "DELETED"]);
    } else {
      console.log(`  → Ma źródło/nr — ręczna weryfikacja.`);
    }
  } else {
    console.log(`  Podstawa #506 nie istnieje — OK.`);
  }

  // === Skan TRC_FDK pod błędną klasyfikację ===
  console.log("\n--- Skan TRC_FDK pod błędne klasyfikacje ---");
  const trcFdk = allBases.filter(b => b.typ === "TRC_FDK");
  let trcSuspect = 0;
  for (const b of trcFdk) {
    // Sprawdź czy stanowisko/uwagi sugerują inny typ
    const text = [b.stanowisko, b.uwagi, b.rodzajUmowy].filter(Boolean).join(" ").toLowerCase();
    let suggestedType = null;
    if (/kszta[łl]ceni|studia|student/i.test(text)) suggestedType = "TRC_STUDIA";
    if (/humanitarn/i.test(text)) suggestedType = "TRC_HUMANITARNE";
    if (/rodzin|ma[łl][żz]on/i.test(text)) suggestedType = "TRC_POBYT_Z_CUDZ";
    if (/dzia[łl]alno[śs]/i.test(text)) suggestedType = "TRC_DZIALALNOSC";

    if (suggestedType) {
      const name = `${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}`.trim();
      console.log(`  [TRC ${b.id}] ${name}: sugerowany typ=${suggestedType} (z tekstu: "${text.substring(0, 60)}")`);
      trcSuspect++;
      csvRows.push(["trc_suspect", String(b.id), String(b.foreignerId), b.foreigner.nazwisko, "typ", b.typ, suggestedType]);
    }
  }
  console.log(`TRC podejrzane: ${trcSuspect} / ${trcFdk.length}\n`);

  console.log(`=== Podsumowanie ===`);
  console.log(`UUID: ${uuidFixed}, TRC podejrzane: ${trcSuspect}`);

  if (REPORT_FILE) {
    const csv = csvRows.map((r) => r.join(";")).join("\n");
    fs.writeFileSync(REPORT_FILE, csv, "utf-8");
    console.log(`Raport: ${REPORT_FILE}`);
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
