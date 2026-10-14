/**
 * Find potential family members — foreigners sharing the same surname.
 *
 * Groups all fdk_foreigners (including hidden) by surname (case-insensitive),
 * then prints groups with 2+ people so the admin can decide which profiles
 * should be consolidated.
 *
 * Also reports:
 *   - Any attachment whose opis starts with "⚠ Dokument innej osoby"
 *   - Full details for surname "Skuratovich" (any case)
 *
 * Usage:
 *   node scripts/find-family-members.mjs
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ── helpers ────────────────────────────────────────────────────────────────

function normalizeSurname(s) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function pad(n, width) {
  return String(n).padStart(width);
}

function formatPerson(f) {
  const hidden = f.hidden ? " [UKRYTY]" : "";
  const atts   = f._count.attachments;
  const bases  = f._count.employmentBases;
  return (
    `    id=${pad(f.id, 5)}  ${(f.imie ?? "").padEnd(16)} ${f.nazwisko.padEnd(24)}` +
    `  obyw: ${(f.obywatelstwo ?? "-").padEnd(12)}` +
    `  zał: ${pad(atts, 3)}  podst: ${pad(bases, 3)}${hidden}`
  );
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  // 1. Fetch ALL foreigners including hidden, with counts + attachments
  const foreigners = await db.fdkForeigner.findMany({
    select: {
      id:             true,
      imie:           true,
      nazwisko:       true,
      obywatelstwo:   true,
      hidden:         true,
      _count: {
        select: {
          attachments:    true,
          employmentBases: true,
        },
      },
      attachments: {
        select: {
          id:          true,
          nazwaPliku:  true,
          opis:        true,
          kategoria:   true,
          folder:      true,
        },
      },
    },
    orderBy: [{ nazwisko: "asc" }, { imie: "asc" }],
  });

  console.log(`\n=== Cudzoziemcy w bazie (łącznie z ukrytymi): ${foreigners.length} ===\n`);

  // ── SECTION A: Surname groups with 2+ people ──────────────────────────────

  const byNormSurname = new Map();
  for (const f of foreigners) {
    const key = normalizeSurname(f.nazwisko);
    if (!byNormSurname.has(key)) byNormSurname.set(key, []);
    byNormSurname.get(key).push(f);
  }

  const groups = [...byNormSurname.entries()]
    .filter(([, members]) => members.length >= 2)
    .sort(([a], [b]) => a.localeCompare(b));

  console.log(`=== GRUPY RODZINNE (to samo nazwisko, ≥2 osoby): ${groups.length} grup ===\n`);

  for (const [normalizedSurname, members] of groups) {
    const displaySurname = members[0].nazwisko; // representative spelling
    console.log(`-- ${displaySurname} (${normalizedSurname}) — ${members.length} osób --`);
    for (const f of members) {
      console.log(formatPerson(f));
    }
    console.log();
  }

  // ── SECTION B: Attachments flagged as "Dokument innej osoby" ─────────────

  const flaggedPrefix = "\u26a0 Dokument innej osoby";  // ⚠ Dokument innej osoby

  const flaggedAttachments = [];
  for (const f of foreigners) {
    for (const att of f.attachments) {
      if (att.opis && att.opis.startsWith(flaggedPrefix)) {
        flaggedAttachments.push({ foreigner: f, att });
      }
    }
  }

  console.log(
    `=== ZAŁĄCZNIKI "⚠ Dokument innej osoby" (${flaggedAttachments.length} szt.) ===\n`
  );

  if (flaggedAttachments.length === 0) {
    console.log("  Brak.\n");
  } else {
    for (const { foreigner: f, att } of flaggedAttachments) {
      const person = `${f.imie ?? ""} ${f.nazwisko}`.trim();
      const hidden = f.hidden ? " [UKRYTY]" : "";
      console.log(`  Profil id=${f.id}  ${person}${hidden}`);
      console.log(`    Załącznik id=${att.id}  ${att.nazwaPliku}`);
      console.log(`    Opis: ${att.opis}`);
      console.log();
    }
  }

  // ── SECTION C: Skuratovich (any case) ────────────────────────────────────

  const skuratovichNorm = "skuratovich";
  const skuratovichGroup = [...byNormSurname.entries()].filter(
    ([key]) => key === skuratovichNorm
  );

  console.log(`=== SKURATOVICH — szczegóły ===\n`);

  if (skuratovichGroup.length === 0) {
    console.log("  Brak profili z nazwiskiem Skuratovich.\n");
  } else {
    for (const [, members] of skuratovichGroup) {
      for (const f of members) {
        const hidden = f.hidden ? " [UKRYTY]" : "";
        console.log(
          `  id=${f.id}  ${(f.imie ?? "").padEnd(16)} ${f.nazwisko}${hidden}`
        );
        console.log(`    obywatelstwo: ${f.obywatelstwo ?? "-"}`);
        console.log(
          `    załączniki: ${f._count.attachments}  podstawy zatrudnienia: ${f._count.employmentBases}`
        );

        if (f.attachments.length > 0) {
          console.log(`    Załączniki:`);
          for (const att of f.attachments) {
            const opis = att.opis ? `  — ${att.opis.substring(0, 120)}` : "";
            console.log(`      [${att.id}] ${att.nazwaPliku} (${att.kategoria}/${att.folder ?? "-"})${opis}`);
          }
        }
        console.log();
      }
    }
  }

  console.log("=== Gotowe ===\n");
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    db.$disconnect();
    process.exit(1);
  });
