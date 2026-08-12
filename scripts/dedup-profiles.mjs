/**
 * Find and clean duplicate foreigner profiles.
 *
 * Finds pairs where one name's tokens are a subset of another's
 * (e.g. {abraham, daniel} ⊂ {abraham, daniel, dominic}).
 *
 * Usage:
 *   node scripts/dedup-profiles.mjs              # dry-run (just report)
 *   node scripts/dedup-profiles.mjs --fix        # auto-delete empty duplicates
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const DO_FIX = process.argv.includes("--fix");

function normalizeTokens(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort();
}

function isSubset(smaller, larger) {
  return smaller.every((t) => larger.includes(t));
}

async function main() {
  const foreigners = await db.fdkForeigner.findMany({
    select: {
      id: true,
      imie: true,
      nazwisko: true,
      _count: { select: { attachments: true, employmentBases: true } },
    },
  });

  console.log(`\nProfile w bazie: ${foreigners.length}\n`);

  // Build token sets
  const entries = foreigners.map((f) => ({
    ...f,
    fullName: `${f.imie ?? ""} ${f.nazwisko}`.trim(),
    tokens: normalizeTokens(`${f.imie ?? ""} ${f.nazwisko}`.trim()),
    total: f._count.attachments + f._count.employmentBases,
  }));

  const pairs = [];

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];

      // Skip if tokens are identical (exact match — not a partial dup)
      if (a.tokens.join("|") === b.tokens.join("|")) {
        // Exact duplicate — still a pair
        pairs.push({ a, b, type: "exact" });
        continue;
      }

      // Check subset relationship
      if (a.tokens.length > 0 && b.tokens.length > 0) {
        if (isSubset(a.tokens, b.tokens) || isSubset(b.tokens, a.tokens)) {
          pairs.push({ a, b, type: "subset" });
        }
      }
    }
  }

  if (pairs.length === 0) {
    console.log("Brak duplikatow.\n");
    await db.$disconnect();
    return;
  }

  console.log(`Znaleziono ${pairs.length} par duplikatow:\n`);

  const autoDelete = [];
  const manual = [];

  for (const { a, b, type } of pairs) {
    const aEmpty = a.total === 0;
    const bEmpty = b.total === 0;

    const label = type === "exact" ? "DOKLADNY" : "PODZBIÓR";

    if (aEmpty && !bEmpty) {
      autoDelete.push({ empty: a, full: b });
      console.log(`  [AUTO-USUN] id=${a.id} "${a.fullName}" (pusty) ← duplikat → id=${b.id} "${b.fullName}" (${b.total} rek.) [${label}]`);
    } else if (bEmpty && !aEmpty) {
      autoDelete.push({ empty: b, full: a });
      console.log(`  [AUTO-USUN] id=${b.id} "${b.fullName}" (pusty) ← duplikat → id=${a.id} "${a.fullName}" (${a.total} rek.) [${label}]`);
    } else if (aEmpty && bEmpty) {
      // Both empty — delete the one with shorter name
      const toDelete = a.tokens.length <= b.tokens.length ? a : b;
      const toKeep = toDelete === a ? b : a;
      autoDelete.push({ empty: toDelete, full: toKeep });
      console.log(`  [AUTO-USUN] id=${toDelete.id} "${toDelete.fullName}" (oba puste, krótsze) ← duplikat → id=${toKeep.id} "${toKeep.fullName}" [${label}]`);
    } else {
      manual.push({ a, b });
      console.log(`  [RECZNA]    id=${a.id} "${a.fullName}" (${a.total} rek.) ↔ id=${b.id} "${b.fullName}" (${b.total} rek.) [${label}]`);
    }
  }

  console.log(`\nDo auto-usuniecia: ${autoDelete.length}`);
  console.log(`Do recznej decyzji: ${manual.length}\n`);

  if (DO_FIX && autoDelete.length > 0) {
    console.log("Usuwam puste duplikaty...\n");
    for (const { empty, full } of autoDelete) {
      await db.fdkForeigner.delete({ where: { id: empty.id } });
      console.log(`  Usunięto id=${empty.id} "${empty.fullName}"`);
    }
    console.log(`\nGotowe — usunięto ${autoDelete.length} pustych duplikatów.`);
  } else if (autoDelete.length > 0) {
    console.log("Uruchom z --fix aby usunac puste duplikaty automatycznie.\n");
  }

  if (manual.length > 0) {
    console.log("\nPARY DO RECZNEJ DECYZJI:");
    for (const { a, b } of manual) {
      console.log(`  id=${a.id} "${a.fullName}" (zal=${a._count.attachments}, podst=${a._count.employmentBases})`);
      console.log(`  id=${b.id} "${b.fullName}" (zal=${b._count.attachments}, podst=${b._count.employmentBases})`);
      console.log();
    }
  }
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    db.$disconnect();
    process.exit(1);
  });
