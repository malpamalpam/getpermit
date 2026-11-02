/**
 * Audit all NIEAKTYWNE employment bases and residence bases.
 * Classifies each as "false" (delete) or "history" (keep as expired/absorbed).
 *
 * Rules:
 * - FALSE: no source attachment, duplicate key (same sygnatura/nrDecyzji/nrOsw as another base),
 *   type not confirmed by document (e.g. OD_POBYT_STALY without matching decision).
 * - HISTORY: real document that expired or was superseded by a newer base.
 *
 * Usage:
 *   node scripts/audit-nieaktywne.mjs                    # dry-run CSV
 *   node scripts/audit-nieaktywne.mjs --delete-false     # delete false records
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const DELETE = process.argv.includes("--delete-false");

async function main() {
  console.log(`Mode: ${DELETE ? "DELETE FALSE RECORDS" : "DRY-RUN AUDIT"}\n`);

  // --- Employment bases ---
  const empBases = await db.fdkEmploymentBase.findMany({
    where: { status: "NIEAKTYWNE" },
    include: {
      foreigner: { select: { id: true, imie: true, nazwisko: true, obywatelstwo: true } },
    },
    orderBy: [{ foreignerId: "asc" }, { id: "asc" }],
  });

  // --- Residence bases ---
  const resBases = await db.fdkResidenceBasis.findMany({
    where: { status: "NIEAKTYWNE" },
    include: {
      foreigner: { select: { id: true, imie: true, nazwisko: true, obywatelstwo: true } },
    },
    orderBy: [{ foreignerId: "asc" }, { id: "asc" }],
  });

  // Get ALL bases (including active) for dedup check
  const allEmpBases = await db.fdkEmploymentBase.findMany({
    select: { id: true, foreignerId: true, typ: true, status: true, nrDecyzji: true, nrOswiadczenia: true, sygnatura: true, dataOd: true, dataDo: true, sourceAttachmentId: true },
  });
  const allResBases = await db.fdkResidenceBasis.findMany({
    select: { id: true, foreignerId: true, typ: true, status: true, nrDecyzji: true, dataOd: true, dataDo: true, sourceAttachmentId: true },
  });

  // Attachments for source check
  const attachmentIds = new Set(
    (await db.fdkAttachment.findMany({ select: { id: true } })).map(a => a.id)
  );

  const FALSE_TYPES = new Set([
    "OD_POBYT_STALY", "OD_REZYDENT_UE", "OD_MALZONEK_PL", "OD_CZLONEK_RODZINY",
    "OD_BLUE_CARD", "OD_HUMANITARNE", "OD_OCHRONA_UZUP", "OD_STUDENT",
    "OD_UE", "OD_UK_WYSTAPIENIE", "OD_UCHODZCA", "OD_WIZA_HUMAN",
    "OD_ABSOLWENT", "OD_KARTA_POLAKA",
  ]);

  console.log("profil_id,profil,tabela,base_id,typ,status,nr_decyzji,nr_osw,data_od,data_do,source_att,decyzja,powod");

  let countFalse = 0;
  let countHistory = 0;

  function classify(base, table, allBases) {
    const f = base.foreigner;
    const profile = `${f.imie ?? ""} ${f.nazwisko}`.trim();
    const nr = base.nrDecyzji || base.nrOswiadczenia || base.sygnatura || "";
    const dataOd = base.dataOd?.toISOString().slice(0, 10) || "";
    const dataDo = base.dataDo?.toISOString().slice(0, 10) || "";
    const srcAtt = base.sourceAttachmentId || "";

    let decision = "historia";
    let reason = "";

    // Rule 1: Legacy OD_* types without source attachment → false
    if (FALSE_TYPES.has(base.typ) && !base.sourceAttachmentId) {
      decision = "usun";
      reason = `Typ ${base.typ} bez pliku źródłowego (legacy/scraper artifact)`;
    }
    // Rule 2: No source attachment AND no document number → false
    else if (!base.sourceAttachmentId && !nr) {
      decision = "usun";
      reason = "Brak pliku źródłowego i numeru dokumentu";
    }
    // Rule 3: Source attachment doesn't exist anymore → false
    else if (base.sourceAttachmentId && !attachmentIds.has(base.sourceAttachmentId)) {
      decision = "usun";
      reason = `Plik źródłowy #${base.sourceAttachmentId} nie istnieje`;
    }
    // Rule 4: Duplicate key (same foreignerId + typ + nrDecyzji as active base)
    else if (nr) {
      const duplicate = allBases.find(b =>
        b.id !== base.id
        && b.foreignerId === base.foreignerId
        && b.status !== "NIEAKTYWNE"
        && (
          (b.nrDecyzji && b.nrDecyzji === base.nrDecyzji)
          || (b.nrOswiadczenia && base.nrOswiadczenia && b.nrOswiadczenia === base.nrOswiadczenia)
          || (b.sygnatura && base.sygnatura && b.sygnatura === base.sygnatura)
        )
      );
      if (duplicate) {
        decision = "usun";
        reason = `Duplikat aktywnej podstawy #${duplicate.id} (${duplicate.typ}, nr=${duplicate.nrDecyzji || duplicate.nrOswiadczenia || duplicate.sygnatura})`;
      }
    }
    // Rule 5: POWIADOMIENIE_UA for non-Ukrainian citizen without PSZ-PPWPU source
    if (decision !== "usun" && base.typ === "POWIADOMIENIE_UA" && f.obywatelstwo && !/ukrain|ua/i.test(f.obywatelstwo)) {
      decision = "usun";
      reason = `Powiadomienie UA u obywatela ${f.obywatelstwo} (nie Ukraina)`;
    }

    // If not false, mark as history
    if (decision !== "usun") {
      decision = "historia";
      reason = reason || "Prawdziwy rekord — wygasły lub wchłonięty";
    }

    if (decision === "usun") countFalse++;
    else countHistory++;

    console.log(`${f.id},"${profile}",${table},${base.id},${base.typ},${base.status},"${nr}","${base.nrOswiadczenia || ""}",${dataOd},${dataDo},${srcAtt},${decision},"${reason}"`);

    return decision;
  }

  // Classify employment bases
  for (const base of empBases) {
    const decision = classify(base, "employment", allEmpBases);
    if (decision === "usun" && DELETE) {
      await db.fdkEmploymentBase.delete({ where: { id: base.id } });
    }
  }

  // Classify residence bases
  for (const base of resBases) {
    const decision = classify(base, "residence", allResBases);
    if (decision === "usun" && DELETE) {
      await db.fdkResidenceBasis.delete({ where: { id: base.id } });
    }
  }

  console.log(`\n--- Podsumowanie ---`);
  console.log(`NIEAKTYWNE employment bases: ${empBases.length}`);
  console.log(`NIEAKTYWNE residence bases: ${resBases.length}`);
  console.log(`Fałszywe (do usunięcia): ${countFalse}`);
  console.log(`Historia (zostaje): ${countHistory}`);
  if (!DELETE && countFalse > 0) console.log("Uruchom z --delete-false żeby usunąć fałszywe.");
}

main()
  .then(() => db.$disconnect())
  .catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
