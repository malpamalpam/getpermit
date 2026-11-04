import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

// 1. Count NIEAKTYWNE bases (should be ~88 if 351 were deleted)
const nieaktywneEmp = await db.fdkEmploymentBase.count({ where: { status: "NIEAKTYWNE" } });
const nieaktywneRes = await db.fdkResidenceBasis.count({ where: { status: "NIEAKTYWNE" } });
console.log(`NIEAKTYWNE employment: ${nieaktywneEmp} (should be ~88 if 351 deleted)`);
console.log(`NIEAKTYWNE residence: ${nieaktywneRes}`);

// 2. Check Khoo (#52) — WP should be absorbed (NIEAKTYWNE with uwagi)
const khooWP = await db.fdkEmploymentBase.findFirst({
  where: { foreignerId: 52, id: 2523 },
  select: { id: true, typ: true, status: true, uwagi: true },
});
console.log(`\nKhoo WP #2523: status=${khooWP?.status} uwagi=${khooWP?.uwagi || "(brak)"}`);

// 3. Check Valovich (#155) — should have no OD_POBYT_STALY
const valPobytStaly = await db.fdkEmploymentBase.findMany({
  where: { foreignerId: 155, typ: "OD_POBYT_STALY" },
  select: { id: true, status: true },
});
console.log(`\nValovich OD_POBYT_STALY records: ${valPobytStaly.length} (should be 0)`);

// 4. Check changelogs for migration scripts
const migLogs = await db.fdkChangeLog.findMany({
  where: { changedBy: { in: ["fix-trc-fdk-fields", "absorb-wp-by-trc", "find-duplicates"] } },
  select: { changedBy: true, changedAt: true },
  orderBy: { changedAt: "desc" },
  take: 5,
});
console.log(`\nMigration changelogs: ${migLogs.length}`);
for (const l of migLogs) {
  console.log(`  ${l.changedAt.toISOString().slice(0,16)} ${l.changedBy}`);
}

// 5. Check folder distribution
const folders = await db.$queryRawUnsafe(`SELECT folder, COUNT(*) as cnt FROM fdk_attachments GROUP BY folder ORDER BY cnt DESC`);
console.log(`\nFolder distribution:`);
for (const f of folders) {
  console.log(`  ${f.folder || "(null)"}: ${f.cnt}`);
}

await db.$disconnect();
