/**
 * Diagnostic script: export "before" state for 5 profiles + analyze anomalies.
 *
 * Usage:
 *   node scripts/diagnose-profiles.mjs
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const db = new PrismaClient();

const TARGET_NAMES = [
  ["Valovich", null],
  ["Morozov", null],
  ["Khoo", null],
  ["Skuratovich", null],
  ["Liudvichenka", null],
];

async function main() {
  const allRows = [];
  const summaryLines = [];

  for (const [nazwisko] of TARGET_NAMES) {
    const profiles = await db.fdkForeigner.findMany({
      where: { nazwisko: { equals: nazwisko, mode: "insensitive" } },
      include: {
        employmentBases: {
          orderBy: { createdAt: "asc" },
          include: {},
        },
        residenceBases: {
          orderBy: { createdAt: "asc" },
        },
        attachments: {
          orderBy: { uploadedAt: "asc" },
        },
        changeLogs: {
          where: { field: "scrape" },
          orderBy: { changedAt: "desc" },
          take: 50,
        },
      },
    });

    for (const f of profiles) {
      const name = `${f.nazwisko} ${f.imie || ""}`.trim();
      summaryLines.push(`\n${"=".repeat(70)}`);
      summaryLines.push(`PROFIL: ${name} (ID ${f.id})`);
      summaryLines.push(`  wProcesie=${f.wProcesie} hidden=${f.hidden} obywatelstwo=${f.obywatelstwo || "-"}`);
      summaryLines.push(`  paszport=${f.nrPaszportu || "-"} DOB=${f.dataUrodzenia?.toISOString().slice(0, 10) || "-"}`);
      summaryLines.push(`  decyzjaPobytowaDo=${f.decyzjaPobytowaDo?.toISOString().slice(0, 10) || "-"}`);
      summaryLines.push(`  Załączniki: ${f.attachments.length} | Podstawy zatrudnienia: ${f.employmentBases.length} | Podstawy pobytu: ${f.residenceBases.length}`);

      // --- Employment bases ---
      summaryLines.push(`\n  --- PODSTAWY ZATRUDNIENIA (${f.employmentBases.length}) ---`);
      const typCounts = {};
      for (const b of f.employmentBases) {
        typCounts[b.typ] = (typCounts[b.typ] || 0) + 1;
        const srcAtt = b.sourceAttachmentId
          ? f.attachments.find((a) => a.id === b.sourceAttachmentId)
          : null;
        const srcName = srcAtt ? srcAtt.nazwaPliku : "(brak źródła)";
        summaryLines.push(
          `  #${b.id} ${b.typ} | ${b.dataOd?.toISOString().slice(0, 10) || "-"} – ${b.dataDo?.toISOString().slice(0, 10) || "-"} | ${b.status}` +
          ` | firma="${b.firma || "-"}" | wyn="${b.wynagrodzenie || "-"}" | nr=${b.nrDecyzji || b.nrOswiadczenia || "-"}` +
          ` | src=${srcName}`
        );

        allRows.push({
          profil: name,
          id_profilu: f.id,
          tabela: "employmentBase",
          id_rekordu: b.id,
          typ: b.typ,
          dataOd: b.dataOd?.toISOString().slice(0, 10) || "",
          dataDo: b.dataDo?.toISOString().slice(0, 10) || "",
          status: b.status,
          firma: b.firma || "",
          wynagrodzenie: b.wynagrodzenie || "",
          nr: b.nrDecyzji || b.nrOswiadczenia || "",
          zrodlo: srcName,
          stanowisko: b.stanowisko || "",
        });
      }
      // Summary of type counts
      summaryLines.push(`  Typy: ${Object.entries(typCounts).map(([t, c]) => `${t}×${c}`).join(", ")}`);

      // Flag anomalies
      const anomalies = [];
      if (f.employmentBases.length > 10) anomalies.push(`DUŻO PODSTAW: ${f.employmentBases.length}`);
      const trcCount = f.employmentBases.filter((b) => b.typ.startsWith("TRC")).length;
      if (trcCount > 3) anomalies.push(`ZA DUŻO TRC: ${trcCount}`);
      // Check for suspicious salaries
      for (const b of f.employmentBases) {
        if (b.wynagrodzenie) {
          const numMatch = b.wynagrodzenie.replace(/\s/g, "").match(/(\d[\d,.]*)/);
          if (numMatch) {
            const val = parseFloat(numMatch[1].replace(/,/g, ".").replace(/\s/g, ""));
            if (val > 100000) anomalies.push(`PODEJRZANE WYNAGRODZENIE #${b.id}: ${b.wynagrodzenie}`);
            if ([17, 50, 51, 100, 340, 400, 440].includes(val)) anomalies.push(`OPŁATA jako WYNAGRODZENIE #${b.id}: ${b.wynagrodzenie}`);
          }
        }
      }
      // Check for bases without source attachment
      const orphanBases = f.employmentBases.filter((b) => !b.sourceAttachmentId);
      if (orphanBases.length > 0) anomalies.push(`PODSTAWY BEZ ŹRÓDŁA: ${orphanBases.length}`);
      // Check for indefinite TRC
      const indefiniteTrc = f.employmentBases.filter((b) => b.typ.startsWith("TRC") && !b.dataDo);
      if (indefiniteTrc.length > 0) anomalies.push(`TRC BEZ DATY DO: ${indefiniteTrc.map((b) => `#${b.id} ${b.typ}`).join(", ")}`);

      if (anomalies.length > 0) {
        summaryLines.push(`  ⚠ ANOMALIE: ${anomalies.join(" | ")}`);
      }

      // --- Residence bases ---
      summaryLines.push(`\n  --- PODSTAWY POBYTU (${f.residenceBases.length}) ---`);
      for (const rb of f.residenceBases) {
        const srcAtt = rb.sourceAttachmentId
          ? f.attachments.find((a) => a.id === rb.sourceAttachmentId)
          : null;
        const srcName = srcAtt ? srcAtt.nazwaPliku : "(brak źródła)";
        summaryLines.push(
          `  #${rb.id} ${rb.typ} | ${rb.dataOd?.toISOString().slice(0, 10) || "-"} – ${rb.dataDo?.toISOString().slice(0, 10) || "-"} | ${rb.status}` +
          ` | nr=${rb.nrDecyzji || "-"} | src=${srcName}`
        );

        allRows.push({
          profil: name,
          id_profilu: f.id,
          tabela: "residenceBasis",
          id_rekordu: rb.id,
          typ: rb.typ,
          dataOd: rb.dataOd?.toISOString().slice(0, 10) || "",
          dataDo: rb.dataDo?.toISOString().slice(0, 10) || "",
          status: rb.status,
          firma: "",
          wynagrodzenie: "",
          nr: rb.nrDecyzji || "",
          zrodlo: srcName,
          stanowisko: "",
        });
      }

      // --- Attachments ---
      summaryLines.push(`\n  --- ZAŁĄCZNIKI (${f.attachments.length}) ---`);
      for (const a of f.attachments) {
        const folderLabel = a.folder || "(brak)";
        const detType = a.detectedType || "(brak)";
        const manual = a.folderManual ? " [MANUAL]" : "";
        const opis = a.opis ? ` | ${a.opis.slice(0, 60)}` : "";
        summaryLines.push(
          `  [${a.kategoria}] ${a.nazwaPliku} | folder=${folderLabel}${manual} | typ=${detType}${opis}`
        );
      }

      // --- Cross-profile attachment check ---
      // Check if other profiles share the same attachment filenames
      if (f.attachments.length > 50) {
        const fileNames = new Set(f.attachments.map((a) => a.nazwaPliku));
        const otherProfiles = await db.fdkAttachment.groupBy({
          by: ["foreignerId"],
          where: {
            nazwaPliku: { in: [...fileNames] },
            foreignerId: { not: f.id },
          },
          _count: true,
        });
        if (otherProfiles.length > 0) {
          summaryLines.push(`\n  ⚠ ZAŁĄCZNIKI WSPÓLNE Z INNYMI PROFILAMI:`);
          for (const op of otherProfiles) {
            const otherF = await db.fdkForeigner.findUnique({ where: { id: op.foreignerId }, select: { nazwisko: true, imie: true } });
            summaryLines.push(`    Profil ${otherF?.nazwisko} ${otherF?.imie} (ID ${op.foreignerId}): ${op._count} wspólnych plików`);
          }
        }
      }
    }
  }

  // Write summary
  const summary = summaryLines.join("\n") + "\n";
  writeFileSync("diagnose-profiles.txt", summary);
  console.log(summary);
  console.log(`\nRaport zapisany: diagnose-profiles.txt`);

  // Write CSV
  const csvHeader = "profil;id_profilu;tabela;id_rekordu;typ;dataOd;dataDo;status;firma;wynagrodzenie;nr;zrodlo;stanowisko";
  const csvRows = allRows.map((r) =>
    [r.profil, r.id_profilu, r.tabela, r.id_rekordu, r.typ, r.dataOd, r.dataDo, r.status, r.firma, r.wynagrodzenie, r.nr, r.zrodlo, r.stanowisko]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(";")
  );
  writeFileSync("diagnose-profiles.csv", "\uFEFF" + csvHeader + "\n" + csvRows.join("\n") + "\n");
  console.log(`CSV zapisany: diagnose-profiles.csv`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
