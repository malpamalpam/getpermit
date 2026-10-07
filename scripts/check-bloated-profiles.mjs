import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // 1. Detail for profile 155
  console.log("=== Profil 155 ===\n");
  const f155 = await db.fdkForeigner.findUnique({
    where: { id: 155 },
    include: {
      employmentBases: { orderBy: { id: "asc" } },
      attachments: { select: { id: true, nazwaPliku: true } },
    },
  });
  if (f155) {
    console.log(`${f155.imie ?? ""} ${f155.nazwisko} | podstaw: ${f155.employmentBases.length} | załączników: ${f155.attachments.length}\n`);

    // Group bases by type
    const byType = {};
    for (const b of f155.employmentBases) {
      if (!byType[b.typ]) byType[b.typ] = [];
      byType[b.typ].push(b);
    }
    for (const [typ, bases] of Object.entries(byType)) {
      console.log(`  ${typ}: ${bases.length}x`);
      for (const b of bases) {
        console.log(`    #${b.id} status=${b.status} od=${b.dataOd?.toISOString().slice(0,10) ?? "null"} do=${b.dataDo?.toISOString().slice(0,10) ?? "null"} nr=${b.nrDecyzji ?? b.nrOswiadczenia ?? "-"} src=${b.sourceAttachmentId ?? "-"}`);
      }
    }
  }

  // 2. Find all profiles with >10 bases
  console.log("\n\n=== Profile z >10 podstawami ===\n");
  const all = await db.fdkForeigner.findMany({
    where: { hidden: false },
    include: {
      employmentBases: { select: { id: true, typ: true, status: true } },
    },
  });

  const bloated = all
    .map(f => ({ id: f.id, name: `${f.imie ?? ""} ${f.nazwisko}`, total: f.employmentBases.length,
      byType: f.employmentBases.reduce((acc, b) => { acc[b.typ] = (acc[b.typ] || 0) + 1; return acc; }, {}),
      active: f.employmentBases.filter(b => b.status === "AKTYWNE").length,
    }))
    .filter(f => f.total > 10)
    .sort((a, b) => b.total - a.total);

  console.log(`Profili z >10 podstawami: ${bloated.length}\n`);
  console.log("ID | Nazwa | Łącznie | Aktywne | Rozkład typów");
  console.log("-".repeat(120));
  for (const f of bloated) {
    const types = Object.entries(f.byType).map(([t, c]) => `${t}:${c}`).join(", ");
    console.log(`${f.id} | ${f.name} | ${f.total} | ${f.active} | ${types}`);
  }

  // 3. Find duplicate bases (same type + same dataDo in one profile)
  console.log("\n\n=== Duplikaty w ramach profilu (sam typ + dataDo) ===\n");
  let totalDupes = 0;
  for (const f of all) {
    const groups = {};
    for (const b of f.employmentBases) {
      const key = `${b.typ}|${b.status}`;
      if (!groups[key]) groups[key] = 0;
      groups[key]++;
    }
    const dupes = Object.entries(groups).filter(([, c]) => c > 2);
    if (dupes.length > 0) {
      const name = `${f.imie ?? ""} ${f.nazwisko}`;
      for (const [key, count] of dupes) {
        console.log(`  profil ${f.id} (${name}): ${key} × ${count}`);
        totalDupes++;
      }
    }
  }
  console.log(`\nŁącznie grup z >2 duplikatami: ${totalDupes}`);

  await db.$disconnect();
}
main().catch(console.error);
