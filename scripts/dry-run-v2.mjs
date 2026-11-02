/**
 * Dry-run v2: Test new scraping pipeline on 5 profiles.
 * Shows diff "before / after" without saving changes to DB.
 *
 * Profiles:
 *   1. ID 142 — TRC – FDK
 *   2. ID 374 — Pobyt stały
 *   3. ID 704 — Ukrainiec z powiadomieniem + PESEL UKR
 *   4. ID 412 — TRC (wielodokumentowy, wiele załączników)
 *   5. ID 280 — profil z wieloma załącznikami
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const db = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Dynamic imports for ESM compatibility
const { parseOswiadczeniePdf, ocrExtractStructured, parseOswiadczenieText } =
  await import("../src/lib/pdf-parser.ts");
const { runPreWriteChecks } = await import("../src/lib/pre-write-checks.ts");
const { classifyToFolder } = await import("../src/lib/folder-classifier.ts");
const { namesMatch } = await import("../src/lib/fdk-queries.ts");
const { mapDetectedTypeToBaseTypes } = await import("../src/lib/legalizacja-config.ts");

const PROFILE_IDS = [142, 374, 704, 412, 280];

async function dryRunProfile(profileId) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`PROFIL #${profileId}`);
  console.log("=".repeat(80));

  const foreigner = await db.fdkForeigner.findUnique({
    where: { id: profileId },
    include: {
      employmentBases: { orderBy: { dataOd: "desc" } },
      attachments: {
        where: { typPliku: { in: ["pdf", "jpeg", "jpg", "png"] } },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!foreigner) {
    console.log(`  [SKIP] Profil nie istnieje`);
    return;
  }

  console.log(`  Imię: ${foreigner.imie ?? "—"}`);
  console.log(`  Nazwisko: ${foreigner.nazwisko}`);
  console.log(`  Obywatelstwo: ${foreigner.obywatelstwo ?? "—"}`);
  console.log(`  PESEL UKR: ${foreigner.ochronaCzasowaUkr}`);
  console.log(`  Decyzja pobytowa do: ${foreigner.decyzjaPobytowaDo?.toISOString().slice(0, 10) ?? "—"}`);
  console.log(`  Podstawy zatrudnienia: ${foreigner.employmentBases.length}`);
  console.log(`  Załączniki (scrapable): ${foreigner.attachments.length}`);

  // Show existing bases
  console.log(`\n  --- STAN PRZED (existing bases) ---`);
  for (const base of foreigner.employmentBases) {
    const od = base.dataOd?.toISOString().slice(0, 10) ?? "—";
    const odo = base.dataDo?.toISOString().slice(0, 10) ?? "—";
    console.log(`  [EMP #${base.id}] ${base.typ} | ${base.status} | ${od} → ${odo} | firma: ${base.firma ?? "—"} | nr: ${base.nrDecyzji ?? base.nrOswiadczenia ?? "—"}`);
  }

  // Check existing residence bases
  let existingResidenceBases = [];
  try {
    existingResidenceBases = await db.fdkResidenceBasis.findMany({
      where: { foreignerId: profileId },
      orderBy: { dataOd: "desc" },
    });
  } catch {
    // Table might not exist yet
  }

  if (existingResidenceBases.length > 0) {
    for (const rb of existingResidenceBases) {
      const od = rb.dataOd?.toISOString().slice(0, 10) ?? "—";
      const odo = rb.dataDo?.toISOString().slice(0, 10) ?? "—";
      console.log(`  [RES #${rb.id}] ${rb.typ} | ${rb.status} | ${od} → ${odo} | nr: ${rb.nrDecyzji ?? "—"}`);
    }
  } else {
    console.log(`  [RES] Brak podstaw pobytowych (nowa tabela)`);
  }

  // Process each attachment
  console.log(`\n  --- SYMULACJA SCRAPINGU (dry-run) ---`);

  let processedCount = 0;
  const maxAttachments = 5; // Limit to 5 per profile to save API costs

  for (const att of foreigner.attachments.slice(0, maxAttachments)) {
    console.log(`\n  📄 [ATT #${att.id}] ${att.nazwaPliku} (${att.typPliku})`);
    console.log(`     Folder: ${att.folder ?? "—"} | Detected: ${att.detectedType ?? "—"}`);

    // Download file
    const { data: fileData, error: dlError } = await supabase.storage
      .from("fdk-attachments")
      .download(att.storagePath);

    if (dlError || !fileData) {
      console.log(`     [ERROR] Download failed: ${dlError?.message ?? "no data"}`);
      continue;
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
      console.log(`     [ERROR] Parse failed: ${err.message}`);
      continue;
    }

    if (!parsed) {
      console.log(`     [SKIP] Brak danych (OCR nie zwrócił wyniku)`);
      continue;
    }

    processedCount++;

    // v2 type mapping
    const classification = mapDetectedTypeToBaseTypes(parsed.detectedType, parsed.firma);

    // Pre-write checks
    const issues = runPreWriteChecks(parsed, {
      imie: foreigner.imie,
      nazwisko: foreigner.nazwisko,
    });

    // Identity check
    const extractedName = `${parsed.imie ?? ""} ${parsed.nazwisko ?? ""}`.trim();
    const profileName = `${foreigner.imie ?? ""} ${foreigner.nazwisko ?? ""}`.trim();
    const nameMatch = !extractedName || !profileName || namesMatch(extractedName, profileName);

    // Output diff
    console.log(`     --- WYNIK PARSOWANIA ---`);
    console.log(`     Typ (parser):       ${parsed.detectedType ?? "—"}`);
    console.log(`     Typ (v2 mapping):   residence=${classification.residenceType ?? "—"}, employment=${classification.employmentType ?? "—"}`);
    console.log(`     Imię/nazwisko:      ${parsed.imie ?? "—"} ${parsed.nazwisko ?? "—"} ${nameMatch ? "✓" : "⚠ INNA OSOBA"}`);
    console.log(`     Data urodzenia:     ${parsed.dataUrodzenia ?? "—"}`);
    console.log(`     Obywatelstwo:       ${parsed.obywatelstwo ?? "—"}`);
    console.log(`     Nr paszportu:       ${parsed.nrPaszportu ?? "—"}`);
    console.log(`     Data od:            ${parsed.dataOd ?? "—"}`);
    console.log(`     Data do:            ${parsed.dataDo ?? "—"}`);
    console.log(`     Firma:              ${parsed.firma ?? "—"}`);
    console.log(`     Stanowisko:         ${parsed.stanowisko ?? "—"}`);
    console.log(`     Rodzaj umowy:       ${parsed.rodzajUmowy ?? "—"}`);
    console.log(`     Wynagrodzenie:      ${parsed.wynagrodzenie ?? "—"}`);
    console.log(`     Nr decyzji:         ${parsed.nrDecyzji ?? "—"}`);
    console.log(`     Nr oświadczenia:    ${parsed.nrOswiadczenia ?? "—"}`);
    console.log(`     Indefinite:         ${classification.isIndefinite}`);
    console.log(`     Flags:              ${classification.flags.length > 0 ? classification.flags.join(", ") : "—"}`);
    console.log(`     Folder (nowy):      ${classifyToFolder(parsed.detectedType ?? null, !nameMatch, att.nazwaPliku)}`);

    if (issues.length > 0) {
      console.log(`     --- KONTROLE PRZED ZAPISEM ---`);
      for (const issue of issues) {
        console.log(`     [#${issue.checkId} ${issue.severity}] ${issue.message}`);
      }
    }

    // Show what WOULD be created
    console.log(`     --- AKCJE (dry-run, bez zapisu) ---`);
    if (classification.residenceType && classification.residenceType !== "UNKNOWN") {
      console.log(`     → UTWORZONO BY podstawę pobytu: ${classification.residenceType}`);
    }
    if (classification.employmentType) {
      console.log(`     → UTWORZONO BY podstawę zatrudnienia: ${classification.employmentType}`);
    }
    if (!nameMatch) {
      console.log(`     → ZABLOKOWANO: dokument innej osoby`);
    }
    if (issues.some(i => i.severity === "error")) {
      console.log(`     → DO WERYFIKACJI: błędy kontroli przed zapisem`);
    }
  }

  if (foreigner.attachments.length > maxAttachments) {
    console.log(`\n  [INFO] Pominięto ${foreigner.attachments.length - maxAttachments} kolejnych załączników (limit dry-run)`);
  }

  console.log(`\n  Przetworzone: ${processedCount}/${Math.min(foreigner.attachments.length, maxAttachments)} załączników`);
}

async function main() {
  console.log("DRY-RUN v2 — Symulacja nowego pipeline scrapingu");
  console.log(`Profile: ${PROFILE_IDS.join(", ")}`);
  console.log(`Data: ${new Date().toISOString()}`);

  for (const id of PROFILE_IDS) {
    await dryRunProfile(id);
  }

  console.log(`\n${"=".repeat(80)}`);
  console.log("DRY-RUN ZAKOŃCZONY — żadne dane NIE zostały zmienione w bazie.");
  console.log("=".repeat(80));

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("Fatal error:", err);
  await db.$disconnect();
  process.exit(1);
});
