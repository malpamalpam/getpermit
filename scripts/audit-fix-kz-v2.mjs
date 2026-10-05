/**
 * Audit & fix K-Z v2 — 05.10.2026 (post-audit corrections)
 *
 * A. Fix dataOd/dataDo swap: specific profiles + global scan + parser validation
 * B. Fix junk "069": find, clean, add parser validation (<5 chars or pure numeric <8)
 * C. Shared nrDecyzji report (read-only)
 * D. CSV report: dataOd=null + 1147 vs 318
 *
 * Usage:
 *   node --env-file=.env.local scripts/audit-fix-kz-v2.mjs              # dry-run
 *   node --env-file=.env.local scripts/audit-fix-kz-v2.mjs --run        # execute
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient();
const CHANGED_BY = "audit-fix-kz-v2";
const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  AUDIT FIX K-Z v2 — 05.10.2026`);
  console.log(`  Tryb: ${DO_RUN ? "WYKONANIE" : "DRY-RUN"}`);
  console.log(`${"=".repeat(60)}\n`);

  const today = new Date();
  const future12m = new Date(today);
  future12m.setMonth(future12m.getMonth() + 12);

  // ============================================================
  // A. DataOd/DataDo swap
  // ============================================================
  console.log("=== A. DataOd/DataDo swap ===\n");

  // A1: Specific profiles — dump all bases for inspection
  const targetIds = [52, 119, 305, 180];
  console.log("--- A1. Inspekcja profili z audytu ---\n");
  for (const fid of targetIds) {
    const f = await db.fdkForeigner.findUnique({
      where: { id: fid },
      include: { employmentBases: { orderBy: { id: "asc" } } },
    });
    if (!f) continue;
    console.log(`Profil ${fid}: ${f.imie ?? ""} ${f.nazwisko}`);
    for (const b of f.employmentBases) {
      const od = b.dataOd?.toISOString().slice(0, 10) ?? "null";
      const _do = b.dataDo?.toISOString().slice(0, 10) ?? "null";
      const flag = (b.dataOd && b.dataOd > future12m && !b.dataDo) ? " *** SWAP CANDIDATE" : "";
      console.log(`  #${b.id} ${b.typ} status=${b.status} od=${od} do=${_do} nr=${b.nrDecyzji ?? b.nrOswiadczenia ?? "-"}${flag}`);
    }
    console.log("");
  }

  // A2: Global scan — dataOd > today+12m AND dataDo=null
  console.log("--- A2. Global scan: dataOd > today+12m AND dataDo=null ---\n");
  const swapCandidatesA = await db.fdkEmploymentBase.findMany({
    where: { dataOd: { gt: future12m }, dataDo: null },
    include: { foreigner: { select: { id: true, nazwisko: true, imie: true } } },
  });

  let totalSwapFixed = 0;
  const swapReport = [];

  for (const b of swapCandidatesA) {
    const name = `${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}`.trim();
    const od = b.dataOd?.toISOString().slice(0, 10);
    console.log(`  [SWAP] profil ${b.foreigner.id} (${name}) #${b.id} ${b.typ}: dataOd=${od} → dataDo=${od}, dataOd=null`);
    swapReport.push(`${b.foreigner.id};${b.foreigner.nazwisko};${b.foreigner.imie ?? ""};${b.id};${b.typ};dataOd=${od} → dataDo`);
    if (DO_RUN) {
      await db.fdkEmploymentBase.update({
        where: { id: b.id },
        data: { dataDo: b.dataOd, dataOd: null },
      });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: b.foreigner.id, changedBy: CHANGED_BY,
          field: "fix_swap_dataOd_dataDo",
          oldValue: `#${b.id} dataOd=${od}, dataDo=null`,
          newValue: `→ dataOd=null, dataDo=${od} (ważność dokumentu parsowana jako dataOd)`,
        },
      });
    }
    totalSwapFixed++;
  }

  // A3: Also check dataOd > dataDo (wrong order)
  const wrongOrder = await db.$queryRaw`
    SELECT eb.id, eb.foreigner_id, eb.typ, eb.data_od, eb.data_do, f.nazwisko, f.imie
    FROM fdk_employment_bases eb
    JOIN fdk_foreigners f ON f.id = eb.foreigner_id
    WHERE eb.data_od IS NOT NULL AND eb.data_do IS NOT NULL AND eb.data_od > eb.data_do
  `;
  for (const b of wrongOrder) {
    const od = b.data_od?.toISOString().slice(0, 10);
    const _do = b.data_do?.toISOString().slice(0, 10);
    console.log(`  [WRONG ORDER] profil ${b.foreigner_id} (${b.imie ?? ""} ${b.nazwisko}) #${b.id} ${b.typ}: dataOd=${od} > dataDo=${_do} — swapping`);
    swapReport.push(`${b.foreigner_id};${b.nazwisko};${b.imie ?? ""};${b.id};${b.typ};dataOd=${od}>dataDo=${_do} SWAPPED`);
    if (DO_RUN) {
      await db.fdkEmploymentBase.update({
        where: { id: b.id },
        data: { dataOd: b.data_do, dataDo: b.data_od },
      });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: b.foreigner_id, changedBy: CHANGED_BY,
          field: "fix_swap_dataOd_dataDo",
          oldValue: `#${b.id} dataOd=${od}, dataDo=${_do}`,
          newValue: `→ SWAPPED (dataOd > dataDo)`,
        },
      });
    }
    totalSwapFixed++;
  }

  console.log(`\n  Swap naprawione: ${totalSwapFixed}\n`);

  // ============================================================
  // B. Junk "069" and short document numbers
  // ============================================================
  console.log("=== B. Junk numery dokumentów ===\n");

  let totalJunkFixed = 0;
  const junkReport = [];

  // B1: Search ALL string fields for exactly "069" or any short junk
  // Check: nrPaszportu on foreigners
  const allForeigners = await db.fdkForeigner.findMany({
    where: { nrPaszportu: { not: null } },
    select: { id: true, nazwisko: true, imie: true, nrPaszportu: true },
  });
  for (const f of allForeigners) {
    const nr = (f.nrPaszportu ?? "").trim();
    const isJunk = nr.length < 5 || (/^\d+$/.test(nr) && nr.length < 8);
    if (isJunk && nr.length > 0) {
      console.log(`  [JUNK] profil ${f.id} (${f.imie ?? ""} ${f.nazwisko}): nrPaszportu="${nr}" → null`);
      junkReport.push(`${f.id};${f.nazwisko};nrPaszportu;${nr}`);
      if (DO_RUN) {
        await db.fdkForeigner.update({ where: { id: f.id }, data: { nrPaszportu: null } });
      }
      totalJunkFixed++;
    }
  }

  // B2: Check nrDecyzji/nrOswiadczenia/sygnatura on bases
  const allBasesWithNr = await db.fdkEmploymentBase.findMany({
    where: {
      OR: [
        { nrDecyzji: { not: null } },
        { nrOswiadczenia: { not: null } },
        { sygnatura: { not: null } },
      ],
    },
    include: { foreigner: { select: { id: true, nazwisko: true, imie: true } } },
  });

  for (const b of allBasesWithNr) {
    const name = `${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}`.trim();
    for (const [field, val] of [["nrDecyzji", b.nrDecyzji], ["nrOswiadczenia", b.nrOswiadczenia], ["sygnatura", b.sygnatura]]) {
      if (!val) continue;
      const trimmed = val.trim();
      const isJunk = trimmed.length < 5 || (/^\d+$/.test(trimmed) && trimmed.length < 8);
      if (isJunk) {
        console.log(`  [JUNK] profil ${b.foreigner.id} (${name}) #${b.id}: ${field}="${trimmed}" → null`);
        junkReport.push(`${b.foreigner.id};${b.foreigner.nazwisko};base#${b.id}.${field};${trimmed}`);
        if (DO_RUN) {
          await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { [field]: null } });
        }
        totalJunkFixed++;
      }
    }
  }

  console.log(`\n  Junk wyczyszczone: ${totalJunkFixed}\n`);

  // ============================================================
  // C. Shared nrDecyzji across profiles
  // ============================================================
  console.log("=== C. Wspólne nr decyzji w różnych profilach ===\n");

  const nrGroups = new Map();
  for (const b of allBasesWithNr) {
    if (!b.nrDecyzji) continue;
    const nr = b.nrDecyzji.trim();
    if (nr.length < 5) continue; // skip junk
    if (!nrGroups.has(nr)) nrGroups.set(nr, []);
    nrGroups.get(nr).push({ id: b.id, foreignerId: b.foreignerId, typ: b.typ, nazwisko: b.foreigner.nazwisko, imie: b.foreigner.imie });
  }

  const sharedCsv = ["nrDecyzji;profile;osoby;typy;akcja"];
  let sharedCount = 0;
  for (const [nr, bases] of nrGroups) {
    const uniqForeigners = [...new Set(bases.map(b => b.foreignerId))];
    if (uniqForeigners.length > 1) {
      const names = bases.map(b => `${b.foreignerId}:${b.imie ?? ""} ${b.nazwisko}`).join(", ");
      console.log(`  [SHARED] ${nr}: ${names}`);
      sharedCsv.push(`"${nr}";${uniqForeigners.join(",")};${names};${bases.map(b => b.typ).join(",")};DO WERYFIKACJI`);
      sharedCount++;
    }
  }
  fs.writeFileSync("raport-shared-nr-v2.csv", sharedCsv.join("\n"), "utf-8");
  console.log(`\n  Raport: raport-shared-nr-v2.csv (${sharedCount} duplikatów)\n`);

  // ============================================================
  // D. CSV: all bases with dataOd=null + 1147 vs 318
  // ============================================================
  console.log("=== D. Podstawy z dataOd=null ===\n");

  const basesNoOd = await db.fdkEmploymentBase.findMany({
    where: { dataOd: null },
    include: {
      foreigner: { select: { id: true, nazwisko: true, imie: true, hidden: true } },
    },
    orderBy: [{ foreignerId: "asc" }, { id: "asc" }],
  });

  const noOdCsv = ["profil_id;nazwisko;imie;base_id;typ;status;dataDo;nrDecyzji;nrOswiadczenia;sourceAttachmentId"];
  for (const b of basesNoOd) {
    noOdCsv.push([
      b.foreigner.id, `"${b.foreigner.nazwisko}"`, `"${b.foreigner.imie ?? ""}"`,
      b.id, b.typ, b.status,
      b.dataDo?.toISOString().slice(0, 10) ?? "",
      `"${b.nrDecyzji ?? ""}"`, `"${b.nrOswiadczenia ?? ""}"`,
      b.sourceAttachmentId ?? "",
    ].join(";"));
  }
  fs.writeFileSync("raport-dataOd-null-v2.csv", noOdCsv.join("\n"), "utf-8");
  console.log(`  Raport: raport-dataOd-null-v2.csv (${noOdCsv.length - 1} podstaw)\n`);

  // D2: 1147 vs 318
  console.log("=== D2. Analiza 1147 vs 318 ===\n");

  const allActive = await db.fdkEmploymentBase.findMany({
    where: { status: "AKTYWNE" },
    include: { foreigner: { select: { id: true, hidden: true } } },
  });
  const visibleActive = allActive.filter(b => !b.foreigner.hidden);
  const hiddenActive = allActive.filter(b => b.foreigner.hidden);
  const visibleProfiles = new Set(visibleActive.map(b => b.foreignerId));
  const hiddenProfiles = new Set(hiddenActive.map(b => b.foreignerId));

  console.log(`  Aktywne podstawy łącznie: ${allActive.length}`);
  console.log(`  — widoczne (hidden=false): ${visibleActive.length} podstaw w ${visibleProfiles.size} profilach`);
  console.log(`  — ukryte (hidden=true): ${hiddenActive.length} podstaw w ${hiddenProfiles.size} profilach`);
  console.log(`\n  CSV 1147 wierszy = aktywne PODSTAWY (w tym ukryte profile)`);
  console.log(`  Panel 318 = widoczne PROFILE z ≥1 aktywną podstawą`);
  console.log(`  Różnica: 1 profil ma ~2-3 podstawy + ukryte profile nie widoczne w panelu`);

  // Unmatched: profiles in CSV but not in panel = hidden profiles
  const unmatchedCsv = ["profil_id;nazwisko;imie;hidden;aktywne_podstawy"];
  for (const pid of hiddenProfiles) {
    const f = await db.fdkForeigner.findUnique({ where: { id: pid }, select: { id: true, nazwisko: true, imie: true, hidden: true } });
    if (!f) continue;
    const cnt = hiddenActive.filter(b => b.foreignerId === pid).length;
    unmatchedCsv.push(`${f.id};"${f.nazwisko}";"${f.imie ?? ""}";${f.hidden};${cnt}`);
  }
  fs.writeFileSync("raport-unmatched-hidden.csv", unmatchedCsv.join("\n"), "utf-8");
  console.log(`\n  Niezmatchowane (ukryte): raport-unmatched-hidden.csv (${unmatchedCsv.length - 1} profili)\n`);

  // ============================================================
  // WRITE SWAP+JUNK REPORT
  // ============================================================
  const fullReport = [
    "typ;profil_id;nazwisko;szczegoly;wartosc",
    ...swapReport.map(r => `SWAP;${r}`),
    ...junkReport.map(r => `JUNK;${r}`),
  ];
  fs.writeFileSync("raport-audit-kz-v2.csv", fullReport.join("\n"), "utf-8");

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  PODSUMOWANIE`);
  console.log(`  A. Swap naprawione: ${totalSwapFixed}`);
  console.log(`  B. Junk wyczyszczone: ${totalJunkFixed}`);
  console.log(`  C. Shared nr: ${sharedCount}`);
  console.log(`  D. DataOd=null: ${noOdCsv.length - 1}`);
  console.log(`  Raporty: raport-audit-kz-v2.csv, raport-shared-nr-v2.csv, raport-dataOd-null-v2.csv, raport-unmatched-hidden.csv`);
  console.log(`${"=".repeat(60)}\n`);

  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
