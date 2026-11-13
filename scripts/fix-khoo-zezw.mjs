/**
 * Manually add Khoo /52 missing Zezwolenie A WRP-II.8671.78630.2024
 * (16.10.2024 – 15.10.2025) to employment bases.
 *
 * Usage:
 *   node scripts/fix-khoo-zezw.mjs              # dry run
 *   node scripts/fix-khoo-zezw.mjs --apply      # apply
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  console.log(`=== Fix Khoo /52 missing Zezwolenie A — ${APPLY ? "APPLY" : "DRY RUN"} ===\n`);

  // Check current employment bases
  const existing = await prisma.fdkEmploymentBase.findMany({
    where: { foreignerId: 52 },
    orderBy: { dataOd: "desc" },
    select: { id: true, typ: true, status: true, dataOd: true, dataDo: true, nrDecyzji: true, sygnatura: true },
  });
  console.log("Current employment bases:");
  for (const b of existing) {
    console.log(`  #${b.id} ${b.typ} ${b.status} ${b.dataOd?.toISOString().slice(0,10) ?? "-"} — ${b.dataDo?.toISOString().slice(0,10) ?? "-"} nr=${b.nrDecyzji ?? "-"} syg=${b.sygnatura ?? "-"}`);
  }

  // Check if already present
  const already = existing.find(
    (b) => (b.nrDecyzji ?? "").includes("78630") ||
            (b.sygnatura ?? "").includes("78630") ||
            (b.dataDo?.toISOString().slice(0,10) === "2025-10-15" && b.typ === "ZEZWOLENIE_A")
  );
  if (already) {
    console.log(`\n✓ Already present: #${already.id} — nothing to do.`);
    await prisma.$disconnect();
    return;
  }

  console.log("\n⚠ Missing: Zezwolenie A WRP-II.8671.78630.2024 (2024-10-16 — 2025-10-15)");

  // Also check for a matching attachment
  const att = await prisma.fdkAttachment.findFirst({
    where: {
      foreignerId: 52,
      OR: [
        { nazwaPliku: { contains: "78630" } },
        { opis: { contains: "78630" } },
        { nrDecyzji: { contains: "78630" } },
      ],
    },
  });
  console.log(`Matching attachment: ${att ? `#${att.id} ${att.nazwaPliku}` : "none found"}`);

  if (!APPLY) {
    console.log("\n[DRY RUN] Would create:");
    console.log("  typ=ZEZWOLENIE_A, status=WYGASLE, dataOd=2024-10-16, dataDo=2025-10-15");
    console.log("  nrDecyzji=78630/2024, sygnatura=WRP-II.8671.78630.2024");
    console.log("  firma=FUNDACJA FIRMA DLA KAŻDEGO, foreignerId=52");
    await prisma.$disconnect();
    return;
  }

  const created = await prisma.fdkEmploymentBase.create({
    data: {
      foreignerId: 52,
      typ: "ZEZWOLENIE_A",
      status: "WYGASLE",
      dataOd: new Date("2024-10-16"),
      dataDo: new Date("2025-10-15"),
      nrDecyzji: "78630/2024",
      sygnatura: "WRP-II.8671.78630.2024",
      firma: "FUNDACJA FIRMA DLA KAŻDEGO",
      sourceAttachmentId: att?.id ?? null,
    },
  });
  console.log(`\n✓ CREATED employment base #${created.id}`);
  console.log("  typ=ZEZWOLENIE_A, status=WYGASLE, 2024-10-16 — 2025-10-15, nr=78630/2024");

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
