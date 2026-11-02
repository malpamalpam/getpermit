/**
 * Reclassify all attachment folders using updated folder-classifier rules.
 * Respects folderManual=true (user overrides).
 *
 * Usage:
 *   node scripts/reclassify-folders.mjs              # dry-run (counts only)
 *   node scripts/reclassify-folders.mjs --csv        # dry-run with CSV output
 *   node scripts/reclassify-folders.mjs --apply      # apply changes
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { classifyToFolder } from "../src/lib/folder-classifier.js";

const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const CSV = process.argv.includes("--csv");

async function main() {
  console.error(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}${CSV ? " (CSV)" : ""}\n`);

  const attachments = await db.fdkAttachment.findMany({
    select: {
      id: true,
      foreignerId: true,
      nazwaPliku: true,
      kategoria: true,
      folder: true,
      folderManual: true,
      detectedType: true,
      opis: true,
    },
    orderBy: [{ foreignerId: "asc" }, { id: "asc" }],
  });

  if (CSV) {
    console.log("att_id,foreigner_id,plik,stara_kat,nowa_kat,powod");
  }

  let changed = 0;
  let skippedManual = 0;
  let unchanged = 0;

  for (const att of attachments) {
    // Skip manual overrides
    if (att.folderManual) {
      skippedManual++;
      continue;
    }

    const isDifferentPerson = att.opis?.startsWith("\u26a0") && /inn(?:ej|a)\s+osob/i.test(att.opis);
    const newFolder = classifyToFolder(
      att.detectedType,
      !!isDifferentPerson,
      att.nazwaPliku,
      att.kategoria,
    );

    const oldFolder = att.folder ?? "inne_dokumenty";
    if (oldFolder === newFolder) {
      unchanged++;
      continue;
    }

    changed++;
    const reason = att.detectedType
      ? `detectedType=${att.detectedType}`
      : `filename match`;

    if (CSV) {
      console.log(`${att.id},${att.foreignerId},"${att.nazwaPliku}",${oldFolder},${newFolder},"${reason}"`);
    }

    if (APPLY) {
      await db.fdkAttachment.update({
        where: { id: att.id },
        data: { folder: newFolder },
      });
    }
  }

  console.error(`\n--- Podsumowanie ---`);
  console.error(`Załączników: ${attachments.length}`);
  console.error(`Zmienionych: ${changed}`);
  console.error(`Bez zmian: ${unchanged}`);
  console.error(`Pominięte (ręczne): ${skippedManual}`);
  if (!APPLY && changed > 0) console.error("Uruchom z --apply żeby zastosować.");
}

main()
  .then(() => db.$disconnect())
  .catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
