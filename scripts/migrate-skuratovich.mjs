/**
 * Migrate Skuratovich family members to FdkFamilyMember relation.
 *
 * Converts Daminik (#?) and Daryian (#?) from separate FDK profiles to
 * family members of Aliaksei Skuratovich.
 *
 * Steps:
 *   1. Find Aliaksei (head), Daminik (son), Daryian (son) by name
 *   2. Move their attachments to Aliaksei's profile (with subfolder = full name)
 *   3. Create FdkFamilyMember relations
 *   4. Hide member profiles (hidden = true)
 *
 * Usage:
 *   node scripts/migrate-skuratovich.mjs          # dry-run
 *   node scripts/migrate-skuratovich.mjs --apply  # apply
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  // Find all Skuratovich profiles
  const all = await db.fdkForeigner.findMany({
    where: { nazwisko: { contains: "Skuratovich", mode: "insensitive" } },
    include: {
      attachments: { orderBy: { uploadedAt: "asc" } },
      employmentBases: true,
    },
    orderBy: { id: "asc" },
  });

  if (all.length === 0) {
    console.log("Brak profili Skuratovich w bazie.");
    return;
  }

  console.log("Znalezieni Skuratovichowie:");
  for (const f of all) {
    console.log(`  id=${f.id}  ${f.imie ?? "?"} ${f.nazwisko}  hidden=${f.hidden}  att=${f.attachments.length}  bases=${f.employmentBases.length}`);
    for (const a of f.attachments) {
      console.log(`    [att#${a.id}] ${a.nazwaPliku} folder=${a.folder ?? "-"} subfolder=${a.subfolder ?? "-"}`);
    }
  }

  // Identify head (Aliaksei) and members (Daminik, Daryian)
  const head = all.find(f => /aliaksei|aliaksie/i.test(f.imie ?? ""));
  const members = all.filter(f => f !== head);

  if (!head) {
    console.error("\nNie znaleziono Aliaksei Skuratovich w bazie!");
    return;
  }

  console.log(`\nGłowa rodziny: id=${head.id} ${head.imie} ${head.nazwisko}`);
  console.log(`Członkowie do przenieść: ${members.map(m => `id=${m.id} ${m.imie}`).join(", ")}`);

  const RELATIONS = [
    { imie: "Daminik", relacja: "syn" },
    { imie: "Daryian", relacja: "syn" },
    { imie: "Veranika", relacja: "żona" },
  ];

  for (const member of members) {
    const memberName = `${member.imie ?? ""} ${member.nazwisko}`.trim();
    const relEntry = RELATIONS.find(r => new RegExp(r.imie, "i").test(member.imie ?? ""));
    const relacja = relEntry?.relacja ?? "inne";

    console.log(`\n--- Migracja: ${memberName} (relacja: ${relacja}) ---`);

    // 1. Check if FamilyMember relation already exists
    const existing = await db.fdkFamilyMember.findFirst({
      where: { headId: head.id, memberId: member.id },
    }).catch(() => null);

    if (existing) {
      console.log(`  [SKIP] Relacja FamilyMember już istnieje (id=${existing.id})`);
    } else {
      console.log(`  [CREATE] FdkFamilyMember: headId=${head.id} memberId=${member.id} relacja=${relacja}`);
      if (APPLY) {
        await db.fdkFamilyMember.create({
          data: { headId: head.id, memberId: member.id, relacja },
        });
      }
    }

    // 2. Move attachments to Aliaksei's profile
    for (const att of member.attachments) {
      // Skip if already in Aliaksei's profile (should not happen normally)
      if (att.foreignerId === head.id) {
        console.log(`  [SKIP att#${att.id}] Już przypisany do głowy rodziny`);
        continue;
      }
      console.log(`  [MOVE att#${att.id}] ${att.nazwaPliku} → foreignerId=${head.id} folder=dokumenty_rodziny subfolder="${memberName}"`);
      if (APPLY) {
        await db.fdkAttachment.update({
          where: { id: att.id },
          data: {
            foreignerId: head.id,
            folder: "dokumenty_rodziny",
            subfolder: memberName,
            folderManual: true,
          },
        });
        await db.fdkChangeLog.create({
          data: {
            foreignerId: head.id,
            changedBy: "migrate-skuratovich",
            field: "attachment_moved",
            oldValue: `att#${att.id} w profilu #${member.id} (${memberName})`,
            newValue: `Przeniesiono do profilu #${head.id}, folder=dokumenty_rodziny, subfolder="${memberName}"`,
          },
        });
      }
    }

    // 3. Hide member profile
    if (member.hidden) {
      console.log(`  [SKIP hidden] Profil #${member.id} już ukryty`);
    } else {
      console.log(`  [HIDE] Ukrywam profil #${member.id} (${memberName})`);
      if (APPLY) {
        await db.fdkForeigner.update({
          where: { id: member.id },
          data: { hidden: true },
        });
        await db.fdkChangeLog.create({
          data: {
            foreignerId: member.id,
            changedBy: "migrate-skuratovich",
            field: "hidden",
            oldValue: "false",
            newValue: `Ukryto: profil przekształcony w członka rodziny Aliaksei Skuratovich #${head.id}`,
          },
        });
      }
    }
  }

  if (!APPLY) {
    console.log("\n✓ Dry-run zakończony. Uruchom z --apply żeby zastosować.");
  } else {
    console.log("\n✓ Migracja zastosowana.");
  }
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    db.$disconnect();
    process.exit(1);
  });
