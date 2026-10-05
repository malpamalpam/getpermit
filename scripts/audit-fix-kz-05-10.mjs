/**
 * Audit & fix script per K-Z audit 05.10.2026.
 *
 * 1. Fix dataOd/dataDo swap (date of expiry parsed as dataOd)
 * 2. Remove junk nrPaszportu/nrDecyzji "069" (<5 chars)
 * 3. Report: shared nrDecyzji across profiles
 * 4. CSV report: bases with dataOd=null
 * 5. Full scan: dataOd in future (>today+12mo) with dataDo=null → swap
 *
 * Usage:
 *   node --env-file=.env.local scripts/audit-fix-kz-05-10.mjs              # dry-run
 *   node --env-file=.env.local scripts/audit-fix-kz-05-10.mjs --run        # execute
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient();
const CHANGED_BY = "audit-fix-kz-05-10";
const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  AUDIT FIX K-Z — 05.10.2026`);
  console.log(`  Tryb: ${DO_RUN ? "WYKONANIE" : "DRY-RUN"}`);
  console.log(`${"=".repeat(60)}\n`);

  const today = new Date();
  const futureThreshold = new Date(today);
  futureThreshold.setMonth(futureThreshold.getMonth() + 12);

  // ============================================================
  // 1. Fix dataOd/dataDo swap — specific profiles + full scan
  // ============================================================
  console.log("=== 1. DataOd/DataDo swap ===\n");

  // Find all bases where dataOd is far in the future and dataDo is null
  // This means "date of expiry" was parsed as dataOd instead of dataDo
  const swapCandidates = await db.fdkEmploymentBase.findMany({
    where: {
      dataOd: { gt: futureThreshold },
      dataDo: null,
    },
    include: { foreigner: { select: { id: true, nazwisko: true, imie: true } } },
  });

  // Also find bases where dataOd > dataDo (clearly swapped)
  const allBases = await db.fdkEmploymentBase.findMany({
    where: {
      dataOd: { not: null },
      dataDo: { not: null },
    },
    include: { foreigner: { select: { id: true, nazwisko: true, imie: true } } },
  });
  const swappedBases = allBases.filter(b => b.dataOd && b.dataDo && b.dataOd > b.dataDo);

  let totalSwapFixed = 0;

  // Fix candidates: move dataOd → dataDo, clear dataOd
  for (const base of swapCandidates) {
    const name = `${base.foreigner.imie ?? ""} ${base.foreigner.nazwisko}`.trim();
    console.log(`  [SWAP] ${name} (profil ${base.foreigner.id}) #${base.id}: dataOd=${base.dataOd?.toISOString().slice(0,10)} → dataDo, dataOd=null`);
    if (DO_RUN) {
      await db.fdkEmploymentBase.update({
        where: { id: base.id },
        data: { dataDo: base.dataOd, dataOd: null },
      });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: base.foreigner.id,
          changedBy: CHANGED_BY,
          field: "fix_swap_dataOd_dataDo",
          oldValue: `#${base.id} dataOd=${base.dataOd?.toISOString().slice(0,10)}, dataDo=null`,
          newValue: `→ dataOd=null, dataDo=${base.dataOd?.toISOString().slice(0,10)} (data ważności parsowana jako dataOd)`,
        },
      });
    }
    totalSwapFixed++;
  }

  // Fix swapped: swap dataOd ↔ dataDo
  for (const base of swappedBases) {
    const name = `${base.foreigner.imie ?? ""} ${base.foreigner.nazwisko}`.trim();
    console.log(`  [SWAP] ${name} (profil ${base.foreigner.id}) #${base.id}: dataOd=${base.dataOd?.toISOString().slice(0,10)} > dataDo=${base.dataDo?.toISOString().slice(0,10)} — swapping`);
    if (DO_RUN) {
      await db.fdkEmploymentBase.update({
        where: { id: base.id },
        data: { dataOd: base.dataDo, dataDo: base.dataOd },
      });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: base.foreigner.id,
          changedBy: CHANGED_BY,
          field: "fix_swap_dataOd_dataDo",
          oldValue: `#${base.id} dataOd=${base.dataOd?.toISOString().slice(0,10)}, dataDo=${base.dataDo?.toISOString().slice(0,10)}`,
          newValue: `→ SWAPPED (dataOd > dataDo)`,
        },
      });
    }
    totalSwapFixed++;
  }

  console.log(`\n  Naprawiono: ${totalSwapFixed} podstaw\n`);

  // ============================================================
  // 2. Remove junk nrPaszportu/nrDecyzji/nrOswiadczenia < 5 chars
  // ============================================================
  console.log("=== 2. Junk nrDokumentu (<5 znaków) ===\n");

  const JUNK_PROFILE_IDS = [77, 78, 79, 91, 100, 118, 119, 122, 131];
  let totalJunkFixed = 0;

  // Clean nrPaszportu on foreigner records
  const foreignersWithJunkPassport = await db.fdkForeigner.findMany({
    where: {
      nrPaszportu: { not: null },
    },
    select: { id: true, nazwisko: true, imie: true, nrPaszportu: true },
  });

  for (const f of foreignersWithJunkPassport) {
    if (f.nrPaszportu && f.nrPaszportu.replace(/\s/g, "").length < 5) {
      console.log(`  [JUNK] Profil ${f.id} (${f.imie ?? ""} ${f.nazwisko}): nrPaszportu="${f.nrPaszportu}" → null`);
      if (DO_RUN) {
        await db.fdkForeigner.update({ where: { id: f.id }, data: { nrPaszportu: null } });
      }
      totalJunkFixed++;
    }
  }

  // Clean junk nrDecyzji/nrOswiadczenia on bases
  const basesWithShortNr = await db.fdkEmploymentBase.findMany({
    where: {
      OR: [
        { nrDecyzji: { not: null } },
        { nrOswiadczenia: { not: null } },
      ],
    },
    include: { foreigner: { select: { id: true, nazwisko: true, imie: true } } },
  });

  for (const base of basesWithShortNr) {
    const name = `${base.foreigner.imie ?? ""} ${base.foreigner.nazwisko}`.trim();
    if (base.nrDecyzji && base.nrDecyzji.replace(/\s/g, "").length < 5) {
      console.log(`  [JUNK] ${name} (profil ${base.foreigner.id}) #${base.id}: nrDecyzji="${base.nrDecyzji}" → null`);
      if (DO_RUN) {
        await db.fdkEmploymentBase.update({ where: { id: base.id }, data: { nrDecyzji: null } });
      }
      totalJunkFixed++;
    }
    if (base.nrOswiadczenia && base.nrOswiadczenia.replace(/\s/g, "").length < 5) {
      console.log(`  [JUNK] ${name} (profil ${base.foreigner.id}) #${base.id}: nrOswiadczenia="${base.nrOswiadczenia}" → null`);
      if (DO_RUN) {
        await db.fdkEmploymentBase.update({ where: { id: base.id }, data: { nrOswiadczenia: null } });
      }
      totalJunkFixed++;
    }
  }

  console.log(`\n  Wyczyszczono: ${totalJunkFixed} śmieciowych numerów\n`);

  // ============================================================
  // 3. Report: shared nrDecyzji across profiles
  // ============================================================
  console.log("=== 3. Wspólne nr decyzji w różnych profilach ===\n");

  const allBasesWithNr = await db.fdkEmploymentBase.findMany({
    where: { nrDecyzji: { not: null } },
    select: { id: true, foreignerId: true, nrDecyzji: true, typ: true },
  });

  // Group by nrDecyzji
  const nrGroups = new Map();
  for (const b of allBasesWithNr) {
    if (!b.nrDecyzji) continue;
    const nr = b.nrDecyzji.trim();
    if (!nrGroups.has(nr)) nrGroups.set(nr, []);
    nrGroups.get(nr).push(b);
  }

  const sharedNrCsv = ["nrDecyzji;profil1;profil2;typ1;typ2;akcja"];
  for (const [nr, bases] of nrGroups) {
    const uniqueForeigners = [...new Set(bases.map(b => b.foreignerId))];
    if (uniqueForeigners.length > 1) {
      console.log(`  [SHARED] ${nr}: profile ${uniqueForeigners.join(", ")}`);
      sharedNrCsv.push(`"${nr}";${uniqueForeigners.join(";")};${bases.map(b => b.typ).join(";")};DO WERYFIKACJI`);
    }
  }
  fs.writeFileSync("raport-shared-nr.csv", sharedNrCsv.join("\n"), "utf-8");
  console.log(`\n  Raport: raport-shared-nr.csv (${sharedNrCsv.length - 1} duplikatów)\n`);

  // ============================================================
  // 4. CSV report: all bases with dataOd=null
  // ============================================================
  console.log("=== 4. Podstawy z dataOd=null ===\n");

  const basesNoDataOd = await db.fdkEmploymentBase.findMany({
    where: { dataOd: null },
    include: {
      foreigner: { select: { id: true, nazwisko: true, imie: true } },
    },
    orderBy: [{ foreignerId: "asc" }, { id: "asc" }],
  });

  const noDataOdCsv = ["profil_id;nazwisko;imie;base_id;typ;status;dataDo;nrDecyzji;nrOswiadczenia;sourceAttachmentId"];
  for (const b of basesNoDataOd) {
    noDataOdCsv.push([
      b.foreigner.id,
      `"${b.foreigner.nazwisko}"`,
      `"${b.foreigner.imie ?? ""}"`,
      b.id,
      b.typ,
      b.status,
      b.dataDo?.toISOString().slice(0, 10) ?? "",
      `"${b.nrDecyzji ?? ""}"`,
      `"${b.nrOswiadczenia ?? ""}"`,
      b.sourceAttachmentId ?? "",
    ].join(";"));
  }
  fs.writeFileSync("raport-dataOd-null.csv", noDataOdCsv.join("\n"), "utf-8");
  console.log(`  Raport: raport-dataOd-null.csv (${noDataOdCsv.length - 1} podstaw bez dataOd)\n`);

  // ============================================================
  // 5. CSV 1147 aktywnych vs panel 318 — analiza
  // ============================================================
  console.log("=== 5. Analiza 1147 vs 318 ===\n");

  const allActiveBases = await db.fdkEmploymentBase.findMany({
    where: { status: "AKTYWNE" },
    include: { foreigner: { select: { id: true, nazwisko: true, hidden: true } } },
  });

  const activeProfiles = new Set(allActiveBases.map(b => b.foreignerId));
  const visibleActiveProfiles = new Set(
    allActiveBases.filter(b => !b.foreigner.hidden).map(b => b.foreignerId)
  );
  const hiddenActiveProfiles = new Set(
    allActiveBases.filter(b => b.foreigner.hidden).map(b => b.foreignerId)
  );

  console.log(`  Aktywne podstawy łącznie: ${allActiveBases.length}`);
  console.log(`  Unikalne profile z aktywną podstawą: ${activeProfiles.size}`);
  console.log(`  Widoczne (hidden=false): ${visibleActiveProfiles.size}`);
  console.log(`  Ukryte (hidden=true): ${hiddenActiveProfiles.size}`);
  console.log(`  Podstawy aktywne w widocznych profilach: ${allActiveBases.filter(b => !b.foreigner.hidden).length}`);
  console.log(`  Podstawy aktywne w ukrytych profilach: ${allActiveBases.filter(b => b.foreigner.hidden).length}`);
  console.log(`\n  WYJAŚNIENIE: CSV zawiera 1147 aktywnych PODSTAW (wierszy), nie profili.`);
  console.log(`  Panel pokazuje 318 aktywnych PROFILI (osób z ≥1 aktywną podstawą, hidden=false).`);
  console.log(`  Różnica: 1 profil może mieć wiele aktywnych podstaw (np. pobytowa + zatrudnieniowa + OD).`);
  console.log(`  Profili ukrytych z aktywnymi podstawami: ${hiddenActiveProfiles.size}`);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  PODSUMOWANIE`);
  console.log(`  DataOd/DataDo swap naprawione: ${totalSwapFixed}`);
  console.log(`  Junk numery wyczyszczone: ${totalJunkFixed}`);
  console.log(`  Raporty: raport-shared-nr.csv, raport-dataOd-null.csv`);
  console.log(`${"=".repeat(60)}\n`);

  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
