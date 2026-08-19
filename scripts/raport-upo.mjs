/**
 * Raport UPO (Urzędowe Poświadczenie Odbioru) z załączników FDK.
 *
 * Szuka plików z "UPO" w nazwie w bazie załączników.
 * Wynik: osoba | data dostarczenia | plik
 *
 * Usage:
 *   node scripts/raport-upo.mjs
 *   node scripts/raport-upo.mjs --report raport-upo.csv
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient();

const args = process.argv.slice(2);
const reportIdx = args.indexOf("--report");
const REPORT_FILE = reportIdx >= 0 ? args[reportIdx + 1] : null;

async function main() {
  // Find all attachments with UPO in filename
  const attachments = await db.fdkAttachment.findMany({
    where: {
      nazwaPliku: { contains: "UPO", mode: "insensitive" },
    },
    include: {
      foreigner: { select: { id: true, imie: true, nazwisko: true } },
    },
    orderBy: [{ foreigner: { nazwisko: "asc" } }, { uploadedAt: "asc" }],
  });

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  RAPORT UPO — Urzędowe Poświadczenie Odbioru`);
  console.log(`${"=".repeat(60)}\n`);
  console.log(`Znaleziono: ${attachments.length} plików z "UPO" w nazwie\n`);

  // Also check for MOS-related UPO files
  const mosAttachments = await db.fdkAttachment.findMany({
    where: {
      nazwaPliku: { contains: "MOS", mode: "insensitive" },
    },
    include: {
      foreigner: { select: { id: true, imie: true, nazwisko: true } },
    },
    orderBy: [{ foreigner: { nazwisko: "asc" } }, { uploadedAt: "asc" }],
  });

  // Merge, deduplicate by id
  const allIds = new Set(attachments.map((a) => a.id));
  for (const a of mosAttachments) {
    if (!allIds.has(a.id)) {
      attachments.push(a);
      allIds.add(a.id);
    }
  }

  // Sort by person name
  attachments.sort((a, b) => {
    const nameA = `${a.foreigner.nazwisko} ${a.foreigner.imie ?? ""}`.trim();
    const nameB = `${b.foreigner.nazwisko} ${b.foreigner.imie ?? ""}`.trim();
    return nameA.localeCompare(nameB, "pl");
  });

  console.log(`Po połączeniu z MOS: ${attachments.length} plików\n`);

  // Print table
  console.log(
    "OSOBA".padEnd(35) +
    "DATA WGRANIA".padEnd(15) +
    "PLIK"
  );
  console.log("-".repeat(100));

  const report = [];

  for (const a of attachments) {
    const name = `${a.foreigner.imie ?? ""} ${a.foreigner.nazwisko}`.trim();
    const date = a.uploadedAt?.toISOString().slice(0, 10) ?? "—";

    console.log(
      name.padEnd(35) +
      date.padEnd(15) +
      a.nazwaPliku
    );

    report.push({
      foreignerId: a.foreigner.id,
      osoba: name,
      dataWgrania: date,
      plik: a.nazwaPliku,
      kategoria: a.kategoria,
      rozmiarKB: Math.round(a.rozmiarBytes / 1024),
    });
  }

  console.log(`\nRazem: ${report.length} plików UPO/MOS`);

  // Foreigners who have TRC (KARTA_POBYTU) base but no UPO
  const trcForeignerIds = await db.fdkEmploymentBase.findMany({
    where: { typ: "KARTA_POBYTU" },
    select: { foreignerId: true },
    distinct: ["foreignerId"],
  });

  const foreignersWithUpo = new Set(attachments.map((a) => a.foreigner.id));
  const missingUpo = trcForeignerIds.filter((t) => !foreignersWithUpo.has(t.foreignerId));

  if (missingUpo.length > 0) {
    const missingForeigners = await db.fdkForeigner.findMany({
      where: { id: { in: missingUpo.map((m) => m.foreignerId) } },
      select: { id: true, imie: true, nazwisko: true },
      orderBy: { nazwisko: "asc" },
    });

    console.log(`\n${"=".repeat(60)}`);
    console.log(`  BRAK UPO — osoby z KARTA_POBYTU bez pliku UPO (${missingForeigners.length}):`);
    console.log(`${"=".repeat(60)}`);
    for (const f of missingForeigners) {
      console.log(`  id=${f.id} ${f.imie ?? ""} ${f.nazwisko}`);
    }
  }

  // Write CSV
  if (REPORT_FILE) {
    const csvLines = ["foreignerId;osoba;data_wgrania;plik;kategoria;rozmiar_KB"];
    for (const r of report) {
      csvLines.push(
        [r.foreignerId, r.osoba, r.dataWgrania, r.plik, r.kategoria, r.rozmiarKB]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(";")
      );
    }
    fs.writeFileSync(REPORT_FILE, csvLines.join("\n"), "utf-8");
    console.log(`\nRaport zapisany: ${REPORT_FILE}`);
  }

  console.log();
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  db.$disconnect();
  process.exit(1);
});
