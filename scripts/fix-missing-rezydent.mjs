/**
 * Create missing OD_REZYDENT_UE / OD_POBYT_STALY bases from attachment filenames.
 * Skips: odmowa, wniosek, pieczątka, wezwanie (not positive decisions).
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-missing-rezydent.mjs              # dry-run
 *   node --env-file=.env.local scripts/fix-missing-rezydent.mjs --run        # execute
 */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");
const CHANGED_BY = "fix-missing-rezydent";

// Skip files that are NOT positive decisions
const SKIP_PATTERNS = /odmow|wniosek|wezwanie|pieczątka|piecz[aą]tka|zlożenie|złożenie|potwierdzenie.*toku|umowa.*długoterminowa|umowa_długoterminow/i;
// Match files that ARE decisions or cards
const DECISION_PATTERNS = /decyzja|decyzj[aę]|KP.*rezydent|karta.*rezydent|karta.*pobyt.*stał/i;

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  FIX MISSING REZYDENT/POBYT STAŁY — ${DO_RUN ? "WYKONANIE" : "DRY-RUN"}`);
  console.log(`${"=".repeat(60)}\n`);

  let created = 0;
  let skipped = 0;

  // === REZYDENT UE ===
  console.log("=== OD_REZYDENT_UE ===\n");
  const rezydentProfiles = [
    // From find-missing-rezydent.mjs output (excluding odmowa/wniosek/wezwanie)
    { id: 491, name: "Konstantin Deev", att: 3086, file: "Deev_Konstantin-karta rezydenta.pdf" },
    { id: 555, name: "Andrey Foteyev", att: 4321, file: "Foteyev_Andrey_decyzja_2025_rezydent_UE.pdf" },
    { id: 315, name: "Elen Gabrielyan", att: 4364, file: "Elen_Gabrielyan-Decyzja_rezydent_UE.pdf" },
    { id: 227, name: "Mariia Iakovleva", att: 5520, file: "Iakovleva_Mariia_decyzja_rezydent_UE.pdf" },
    { id: 670, name: "Bohdan Kirff", att: 7305, file: "Bohdan_Kirff_decyzja_rezydent_UE (2025-2030).pdf" },
    { id: 703, name: "Ian Chabvamuperu Kundai", att: 7899, file: "Kundai_Ian_Chabvamuperu_decyzja_rezydent_UE.pdf" },
    { id: 333, name: "Nadiia Lobashchuk", att: 8680, file: "Lobashchuk_Nadiia_decyzja_rezydent_UE.pdf" },
    { id: 747, name: "Vitalii Lustin", att: 8898, file: "decission_rezydent_Unii_Lustin_Vitalii.pdf" },
    { id: 177, name: "Oleh Rula", att: 13330, file: "Oleh_Rula-decyzja rezydenta, KP 2023-2028.pdf" },
    { id: 992, name: "Sopin Sergey", att: 15067, file: "Sopin rezydent decyzja.pdf" },
    { id: 995, name: "Andrii Sotnikov", att: 15098, file: "Andrii Sotnikov - decyzja rezydent UE.pdf" },
  ];

  // Skipped: 375 (pieczątka), 1014 (odmowna), 1084 (złożenie wniosku)
  console.log("  SKIP: 375 (Abdarshitov) — pieczątka, nie decyzja");
  console.log("  SKIP: 1014 (Tairov) — decyzja ODMOWNA");
  console.log("  SKIP: 1084 (Yurkevych) — złożenie wniosku, nie decyzja\n");
  skipped += 3;

  for (const p of rezydentProfiles) {
    // Check if already has the base
    const existing = await db.fdkEmploymentBase.findFirst({
      where: { foreignerId: p.id, typ: { in: ["OD_REZYDENT_UE", "DOSTEP_REZYDENT_UE"] } },
    });
    if (existing) { console.log(`  [SKIP] ${p.id} (${p.name}) — już ma #${existing.id}`); skipped++; continue; }

    console.log(`  [CREATE] ${p.id} (${p.name}) ← ${p.file}`);
    if (DO_RUN) {
      const base = await db.fdkEmploymentBase.create({
        data: {
          foreignerId: p.id,
          typ: "OD_REZYDENT_UE",
          status: "AKTYWNE",
          dataOd: null, // do uzupełnienia z dokumentu
          dataDo: null, // bezterminowy
          sourceAttachmentId: p.att,
        },
      });
      await db.fdkChangeLog.create({
        data: { foreignerId: p.id, changedBy: CHANGED_BY, field: "scrape",
          oldValue: null, newValue: `Utworzono #${base.id} OD_REZYDENT_UE z pliku: ${p.file}` },
      });
      await db.fdkForeigner.update({
        where: { id: p.id },
        data: { typDokumentuPobytowego: "Rezydent długoterminowy UE (art. 211)", decyzjaPobytowaDo: null },
      });
    }
    created++;
  }

  // === POBYT STAŁY ===
  console.log("\n=== OD_POBYT_STALY ===\n");
  const stalProfiles = [
    { id: 374, name: "Anas Abbas", att: 133, file: "Abbas_Anas_decyzja_pobyt_stały_2020.pdf" },
    { id: 270, name: "Karalina Baranouskaya", att: 1328, file: "Baranouskaya_Karalina_decyzja_POBYT_STALY.pdf" },
    { id: 484, name: "Aryna Daniliuk", att: 2812, file: "Daniliuk_Aryna-decyzja_pobyt_staly_2023-2033.pdf" },
    { id: 203, name: "Yauhen Dziachek", att: 3471, file: "Dziachek_Yauhen_pobyt_stały_2024-2034_decyzja.pdf" },
    { id: 192, name: "Artur Hinko", att: 5337, file: "Hinko_Artur_pobyt_stały_Decyzja.pdf" },
    { id: 597, name: "Olga Holubenna", att: 5417, file: "Holubenna_Olga_decyzja_pobyt_stały.pdf" },
    { id: 662, name: "Charles Kwame Dzigbodi Keel", att: 6819, file: "Keel_Charles_Kwame_Dzigbodi-KP_pobyt_stały_2022-2032 (1).pdf" },
    { id: 697, name: "Irina Kudriavtseva", att: 7814, file: "Kudriavtseva_Irina_KP_pobyt_staly_2024-2034.pdf" },
    { id: 738, name: "Uladzislava Loika", att: 8714, file: "Loika- KP pobyt stały.pdf" },
    { id: 287, name: "Irina Maximova", att: 9711, file: "Karta_Pobytu_pobyt_stały_2036.pdf" },
    { id: 790, name: "Anastasiia Merenkova", att: 10035, file: "Anastasiia Merenkova decyzja- pobyt staly.pdf" },
    { id: 196, name: "Hanna Milasheuskaya", att: 10379, file: "Milasheuskaya_Hanna_pobyt_stały_2024-2034.pdf" },
    { id: 249, name: "Mitchell Welle", att: 10441, file: "Mitchell_Thomas_Welle_decyzjapobyt stały.pdf" },
    { id: 823, name: "Natalia Chyvel", att: 11055, file: "Decyzja_pobyt_stały_Natalia_Chyvel.pdf" },
    { id: 302, name: "Ekatherina Pankevich", att: 12144, file: "Pankevich_Ekatherina_decyzja_2024_pobyt_staly.pdf" },
    { id: 889, name: "Nastasiia Radzivonava", att: 12746, file: "Radzivonava_Nastasiia_pobyt stały_decyzja.pdf" },
    { id: 246, name: "Illia Sukhostavskyi", att: 15425, file: "Sukhostavskyi_Illia_decyzja_pobyt_stały.pdf" },
    { id: 1025, name: "Bruce Tomecko", att: 15709, file: "Pobyt_staly_Tomecko_Bruce_decyzja.pdf" },
    { id: 226, name: "Viktoriia Hrankina", att: 17529, file: "Viktoriia_Hrankina - decyzja_pobyt_stały.pdf" },
  ];

  // Skipped: 804 (umowa długoterminowa — not a decision), 484 partial (umowa skip but decyzja exists)
  console.log("  SKIP: 804 (Misura) — umowa długoterminowa, nie decyzja");
  skipped++;

  for (const p of stalProfiles) {
    const existing = await db.fdkEmploymentBase.findFirst({
      where: { foreignerId: p.id, typ: { in: ["OD_POBYT_STALY", "DOSTEP_POBYT_STALY"] } },
    });
    if (existing) { console.log(`  [SKIP] ${p.id} (${p.name}) — już ma #${existing.id}`); skipped++; continue; }

    console.log(`  [CREATE] ${p.id} (${p.name}) ← ${p.file}`);
    if (DO_RUN) {
      const base = await db.fdkEmploymentBase.create({
        data: {
          foreignerId: p.id,
          typ: "OD_POBYT_STALY",
          status: "AKTYWNE",
          dataOd: null,
          dataDo: null, // bezterminowy (pobyt stały = indefinite)
          sourceAttachmentId: p.att,
        },
      });
      await db.fdkChangeLog.create({
        data: { foreignerId: p.id, changedBy: CHANGED_BY, field: "scrape",
          oldValue: null, newValue: `Utworzono #${base.id} OD_POBYT_STALY z pliku: ${p.file}` },
      });
      await db.fdkForeigner.update({
        where: { id: p.id },
        data: { typDokumentuPobytowego: "Pobyt stały (art. 195)", decyzjaPobytowaDo: null },
      });
    }
    created++;
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Utworzono: ${created}`);
  console.log(`  Pominięto: ${skipped}`);
  console.log(`${"=".repeat(60)}\n`);

  await db.$disconnect();
}

main().catch(console.error);
