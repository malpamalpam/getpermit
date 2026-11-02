/**
 * Re-scrape 114 active TRC profiles (wProcesie = true) using the v2 pipeline.
 * Calls the /api/fdk/attachments/[id]?action=scrape endpoint for each scrapable attachment.
 * This creates both FdkEmploymentBase AND FdkResidenceBasis records.
 *
 * Usage:
 *   npx tsx scripts/rescrape-114-v2.mjs                    # plan only (dry-run)
 *   npx tsx scripts/rescrape-114-v2.mjs --run              # execute
 *   npx tsx scripts/rescrape-114-v2.mjs --run --limit 10   # first 10 profiles only
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient();

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 0;
const REPORT_FILE = "raport-rescrape-114-v2.csv";
const BASE_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Scrape API requires admin auth — we call the DB directly instead
const { parseOswiadczeniePdf, ocrExtractStructured } = await import("../src/lib/pdf-parser.ts");
const { classifyToFolder } = await import("../src/lib/folder-classifier.ts");
const { namesMatch } = await import("../src/lib/fdk-queries.ts");
const { mapDetectedTypeToBaseTypes } = await import("../src/lib/legalizacja-config.ts");
const { runPreWriteChecks } = await import("../src/lib/pre-write-checks.ts");
const { createClient } = await import("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const CHANGED_BY = "rescrape-114-v2";

// Skip patterns — documents that should not be scraped
const SKIP_PATTERNS = [
  /paszport/i, /passport/i, /dow[oó]d[\s_]*osobist/i, /zdj[eę]ci/i, /photo/i,
  /ankiet/i, /rodo/i, /umowa/i, /umow[aey]/i, /za[lł][aą]cznik[\s_]*nr/i,
  /pe[lł]nomocnictw/i, /rachun/i, /op[lł]at/i, /polisa/i, /pesel/i,
  /t[lł]umaczeni/i, /korekta/i, /draft/i, /wnios[ek]/i,
  /wezwanie/i, /odpowied[źz]/i, /ponagleni/i, /pismo/i,
  /karta[\s_]*polak/i, /legitymac/i, /certific/i, /dyplom/i,
  /foundation[\s_]*registration/i, /kwestionariusz/i, /statut/i,
  /WNIOSEK-OSW_/i, /OSW-UTRZYMANIE_/i, /OSW-NIEKARALNOSC_/i, /OSW-POBYT-3-LATA_/i,
];

function shouldSkip(fileName) {
  const name = fileName.toLowerCase();
  if (name.startsWith("._") || name.startsWith("~$")) return true;
  return SKIP_PATTERNS.some(p => p.test(fileName));
}

// CSV report rows
const csvRows = [];

async function scrapeAttachment(foreigner, att) {
  const row = {
    foreignerId: foreigner.id,
    nazwisko: foreigner.nazwisko,
    imie: foreigner.imie ?? "",
    attachmentId: att.id,
    fileName: att.nazwaPliku,
    detectedType: "",
    residenceType: "",
    employmentType: "",
    action: "",
    warning: "",
  };

  if (shouldSkip(att.nazwaPliku)) {
    row.action = "SKIP (filename)";
    csvRows.push(row);
    return;
  }

  if (!["pdf", "jpeg", "jpg", "png"].includes(att.typPliku)) {
    row.action = "SKIP (type)";
    csvRows.push(row);
    return;
  }

  // Download
  const { data: fileData, error: dlError } = await supabase.storage
    .from("fdk-attachments")
    .download(att.storagePath);

  if (dlError || !fileData) {
    row.action = "ERROR (download)";
    row.warning = dlError?.message ?? "no data";
    csvRows.push(row);
    return;
  }

  const buffer = await fileData.arrayBuffer();
  const isImage = ["jpeg", "jpg", "png"].includes(att.typPliku);

  let parsed;
  try {
    if (isImage) {
      const mediaType = att.typPliku === "png" ? "image/png" : "image/jpeg";
      parsed = await ocrExtractStructured(buffer, mediaType, att.nazwaPliku);
    } else {
      parsed = await parseOswiadczeniePdf(buffer, { filename: att.nazwaPliku });
    }
  } catch (err) {
    row.action = "ERROR (parse)";
    row.warning = err.message;
    csvRows.push(row);
    return;
  }

  if (!parsed) {
    row.action = "SKIP (no data)";
    csvRows.push(row);
    return;
  }

  row.detectedType = parsed.detectedType ?? "";

  // Identity check
  const extractedName = `${parsed.imie ?? ""} ${parsed.nazwisko ?? ""}`.trim();
  const profileName = `${foreigner.imie ?? ""} ${foreigner.nazwisko ?? ""}`.trim();
  const nameOk = !extractedName || !profileName || foreigner.nazwisko === "Nowy"
    || namesMatch(extractedName, profileName);

  if (!nameOk) {
    row.action = "SKIP (inna osoba)";
    row.warning = extractedName;
    csvRows.push(row);

    if (DO_RUN) {
      await db.fdkAttachment.update({
        where: { id: att.id },
        data: { opis: `⚠ Dokument innej osoby: ${extractedName}`, folder: "dokumenty_rodziny" },
      });
    }
    return;
  }

  // Pre-write checks
  const issues = runPreWriteChecks(parsed, { imie: foreigner.imie, nazwisko: foreigner.nazwisko });
  const hasErrors = issues.some(i => i.severity === "error");

  // Type mapping
  const mapping = mapDetectedTypeToBaseTypes(parsed.detectedType, parsed.firma);
  row.residenceType = mapping.residenceType ?? "";
  row.employmentType = mapping.employmentType ?? "";

  if (hasErrors) {
    row.action = "DO WERYFIKACJI";
    row.warning = issues.filter(i => i.severity === "error").map(i => `#${i.checkId}: ${i.message}`).join("; ");
    csvRows.push(row);
    return;
  }

  if (!DO_RUN) {
    row.action = "PLAN (dry-run)";
    csvRows.push(row);
    return;
  }

  // === EXECUTE: Create/update bases ===
  const docType = (parsed.detectedType ?? "OSWIADCZENIE");
  const actions = [];

  // --- Employment base ---
  if (mapping.employmentType && parsed.detectedType !== "ODWOLANIE") {
    let existingBase = await db.fdkEmploymentBase.findFirst({
      where: { foreignerId: foreigner.id, sourceAttachmentId: att.id, typ: docType },
    });
    if (!existingBase && parsed.nrOswiadczenia) {
      existingBase = await db.fdkEmploymentBase.findFirst({
        where: { foreignerId: foreigner.id, typ: docType, nrOswiadczenia: parsed.nrOswiadczenia },
      });
    } else if (!existingBase && parsed.nrDecyzji) {
      existingBase = await db.fdkEmploymentBase.findFirst({
        where: { foreignerId: foreigner.id, typ: docType, nrDecyzji: parsed.nrDecyzji },
      });
    }

    const baseData = {
      foreignerId: foreigner.id,
      typ: docType,
      status: "BRAK_DANYCH",
      sourceAttachmentId: att.id,
      dataOd: parsed.dataOd ? new Date(parsed.dataOd) : null,
      dataDo: parsed.dataDo ? new Date(parsed.dataDo) : null,
      rodzajUmowy: parsed.rodzajUmowy || null,
      stanowisko: parsed.stanowisko || null,
      przedmiotDziela: parsed.przedmiotDziela || null,
      firma: parsed.firma || null,
      nrDecyzji: docType === "OSWIADCZENIE" ? null : (parsed.nrDecyzji || null),
      nrOswiadczenia: docType === "OSWIADCZENIE" ? (parsed.nrOswiadczenia || null) : null,
      wynagrodzenie: parsed.wynagrodzenie || null,
    };

    if (existingBase) {
      const upd = {};
      for (const [k, v] of Object.entries(baseData)) {
        if (k === "foreignerId") continue;
        if (v !== null && v !== undefined) upd[k] = v;
      }
      await db.fdkEmploymentBase.update({ where: { id: existingBase.id }, data: upd });
      actions.push(`EMP#${existingBase.id} updated`);
    } else {
      const b = await db.fdkEmploymentBase.create({ data: baseData });
      actions.push(`EMP#${b.id} created`);
    }
  }

  // --- Residence base ---
  if (mapping.residenceType) {
    let existingRes = await db.fdkResidenceBasis.findFirst({
      where: { foreignerId: foreigner.id, sourceAttachmentId: att.id, typ: mapping.residenceType },
    });
    if (!existingRes && parsed.nrDecyzji) {
      existingRes = await db.fdkResidenceBasis.findFirst({
        where: { foreignerId: foreigner.id, typ: mapping.residenceType, nrDecyzji: parsed.nrDecyzji },
      });
    }

    const resData = {
      foreignerId: foreigner.id,
      typ: mapping.residenceType,
      status: "BRAK_DANYCH",
      sourceAttachmentId: att.id,
      dataOd: parsed.dataOd ? new Date(parsed.dataOd) : null,
      dataDo: mapping.isIndefinite ? null : (parsed.dataDo ? new Date(parsed.dataDo) : null),
      nrDecyzji: parsed.nrDecyzji || null,
      flags: mapping.flags.length > 0 ? JSON.stringify(mapping.flags) : "[]",
    };

    if (existingRes) {
      const upd = {};
      for (const [k, v] of Object.entries(resData)) {
        if (k === "foreignerId") continue;
        if (v !== null && v !== undefined) upd[k] = v;
      }
      await db.fdkResidenceBasis.update({ where: { id: existingRes.id }, data: upd });
      actions.push(`RES#${existingRes.id} updated`);
    } else {
      const rb = await db.fdkResidenceBasis.create({ data: resData });
      actions.push(`RES#${rb.id} created`);
    }
  }

  // --- Update foreigner data ---
  const fUpd = {};
  if (parsed.imie && !foreigner.imie) fUpd.imie = parsed.imie;
  if (parsed.nazwisko && foreigner.nazwisko === "Nowy") fUpd.nazwisko = parsed.nazwisko;
  if (parsed.dataUrodzenia && !foreigner.dataUrodzenia) fUpd.dataUrodzenia = new Date(parsed.dataUrodzenia);
  if (parsed.obywatelstwo && !foreigner.obywatelstwo) fUpd.obywatelstwo = parsed.obywatelstwo;
  if (parsed.nrPaszportu && !foreigner.nrPaszportu) fUpd.nrPaszportu = parsed.nrPaszportu;
  if (Object.keys(fUpd).length > 0) {
    await db.fdkForeigner.update({ where: { id: foreigner.id }, data: fUpd });
    actions.push(`foreigner updated: ${Object.keys(fUpd).join(",")}`);
  }

  // --- Update attachment folder ---
  const folder = classifyToFolder(parsed.detectedType ?? null, false, att.nazwaPliku);
  await db.fdkAttachment.update({
    where: { id: att.id },
    data: { detectedType: parsed.detectedType ?? null, folder: att.folderManual ? undefined : folder },
  });

  // --- Log ---
  await db.fdkChangeLog.create({
    data: {
      foreignerId: foreigner.id,
      changedBy: CHANGED_BY,
      field: "scrape",
      oldValue: null,
      newValue: `v2 rescrape: ${att.nazwaPliku} → ${actions.join(", ")}`,
    },
  });

  row.action = actions.join(", ");
  if (issues.length > 0) {
    row.warning = issues.map(i => `#${i.checkId}(${i.severity})`).join(",");
  }
  csvRows.push(row);
}

async function main() {
  console.log(`Re-scrape 114 profili TRC (wProcesie=true) — v2 pipeline`);
  console.log(`Mode: ${DO_RUN ? "EXECUTE" : "DRY-RUN (plan only)"}`);
  console.log(`Date: ${new Date().toISOString()}\n`);

  const profiles = await db.fdkForeigner.findMany({
    where: { wProcesie: true, hidden: false },
    include: {
      attachments: {
        where: { typPliku: { in: ["pdf", "jpeg", "jpg", "png"] } },
        orderBy: { id: "asc" },
      },
      employmentBases: { select: { id: true, typ: true, status: true } },
    },
    orderBy: { id: "asc" },
    ...(LIMIT > 0 ? { take: LIMIT } : {}),
  });

  console.log(`Znaleziono ${profiles.length} profili.\n`);

  let totalAttachments = 0;
  let processedAttachments = 0;

  for (let i = 0; i < profiles.length; i++) {
    const f = profiles[i];
    const scrapable = f.attachments.filter(a => !shouldSkip(a.nazwaPliku));
    totalAttachments += f.attachments.length;
    console.log(`[${i + 1}/${profiles.length}] #${f.id} ${f.imie ?? ""} ${f.nazwisko} — ${f.attachments.length} att (${scrapable.length} scrapable)`);

    for (const att of f.attachments) {
      await scrapeAttachment(f, att);
      processedAttachments++;

      if (processedAttachments % 50 === 0) {
        console.log(`  ... processed ${processedAttachments} attachments total`);
      }
    }
  }

  // Write CSV report
  const header = "foreignerId,nazwisko,imie,attachmentId,fileName,detectedType,residenceType,employmentType,action,warning";
  const lines = csvRows.map(r =>
    [r.foreignerId, r.nazwisko, r.imie, r.attachmentId, `"${r.fileName}"`,
     r.detectedType, r.residenceType, r.employmentType, `"${r.action}"`, `"${r.warning}"`].join(",")
  );
  fs.writeFileSync(REPORT_FILE, header + "\n" + lines.join("\n"), "utf-8");

  // Summary
  const created = csvRows.filter(r => r.action.includes("created"));
  const updated = csvRows.filter(r => r.action.includes("updated"));
  const skipped = csvRows.filter(r => r.action.startsWith("SKIP"));
  const errors = csvRows.filter(r => r.action.startsWith("ERROR"));
  const verify = csvRows.filter(r => r.action === "DO WERYFIKACJI");

  console.log(`\n${"=".repeat(60)}`);
  console.log(`PODSUMOWANIE`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Profile:        ${profiles.length}`);
  console.log(`Załączniki:     ${totalAttachments}`);
  console.log(`Utworzone:       ${created.length}`);
  console.log(`Zaktualizowane: ${updated.length}`);
  console.log(`Pominięte:      ${skipped.length}`);
  console.log(`Błędy:          ${errors.length}`);
  console.log(`Do weryfikacji: ${verify.length}`);
  console.log(`Raport:         ${REPORT_FILE}`);

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("Fatal:", err);
  await db.$disconnect();
  process.exit(1);
});
