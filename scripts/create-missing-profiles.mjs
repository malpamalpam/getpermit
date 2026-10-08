/**
 * Create profiles for 23 missing people from the TRC list,
 * then reassign family-member attachments from relatives' profiles.
 *
 * Usage:
 *   node scripts/create-missing-profiles.mjs              # dry-run
 *   node scripts/create-missing-profiles.mjs --apply      # create profiles + reassign attachments
 */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const CHANGED_BY = "create-missing-profiles";

// 23 missing people: [nazwisko, imie, relativeId (or null)]
// relativeId = existing profile that may hold family member documents
const MISSING = [
  ["Abrazhevich", "Arina", 63],           // relative: Kirill
  ["Andrukhina-Pranchuk", "Yelizaveta", 89], // relative: Pranchuk Dzmitry
  ["Daniels", "Florence Kuwani", null],
  ["Filatava", "Hanna", 82],              // relative: Filatau Aleh
  ["Jasi", "Bright", null],
  ["Jasi", "Heather", null],
  ["Jasi", "Bryce Thabiso", null],
  ["Malinouskaya", "Yaraslava", 139],      // relative: Malinovski Pavel
  ["Malinouskaya", "Vasilisa", 139],       // relative: Malinovski Pavel
  ["Mezentsava", "Rose", 99],              // relative: Mezentsau Ihar
  ["Mkhwanazi", "Gugulethu Khethiwe", null],
  ["Nossoff", "Daniel", 165],             // relative: Nossoff Alexandra
  ["Nossoff", "Sergei Igorevich", 165],   // relative: Nossoff Alexandra
  ["Novik", "Yuliya", null],
  ["Siamenchyk", "Yauheniya", null],
  ["Skuratovich", "Daminik", 142],        // relative: Skuratovich Aliaksei
  ["Skuratovich", "Daryian", 142],        // relative: Skuratovich Aliaksei
  ["TARASEVICH", "Leu", 122],             // relative: Tarasevich Ilya
  ["USPENSKAYA", "NINA", 122],             // relative: Tarasevich Ilya
  ["Valovich", "MARYIA", 155],            // relative: Valovich Viktar
  ["Valovich", "VALIANTSIN", 155],        // relative: Valovich Viktar
  ["Valovich", "VIACHASLAU", 155],        // relative: Valovich Viktar
  ["Valovich", "VERA", 155],              // relative: Valovich Viktar
];

/**
 * Check if attachment opis/filename contains the person's name.
 */
function attachmentMatchesPerson(att, imie, nazwisko) {
  const imieLower = imie.toLowerCase().split(/\s+/)[0]; // first name only
  const nazwiskoLower = nazwisko.toLowerCase();

  // Check opis (⚠ Dokument innej osoby: Imie Nazwisko)
  if (att.opis) {
    const opisLower = att.opis.toLowerCase();
    if (opisLower.includes(imieLower) || opisLower.includes(nazwiskoLower)) return true;
  }

  // Check filename
  const fileLower = att.nazwaPliku.toLowerCase().replace(/[_-]/g, " ");
  if (fileLower.includes(imieLower) && fileLower.includes(nazwiskoLower)) return true;
  if (fileLower.includes(nazwiskoLower) && fileLower.includes(imieLower)) return true;

  // Check display name
  const displayLower = att.nazwaWyswietlana.toLowerCase().replace(/[_-]/g, " ");
  if (displayLower.includes(imieLower) && displayLower.includes(nazwiskoLower)) return true;

  return false;
}

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  let created = 0;
  let reassigned = 0;

  for (const [nazwisko, imie, relativeId] of MISSING) {
    // Check if profile already exists (someone may have created it manually)
    const existing = await db.fdkForeigner.findFirst({
      where: {
        nazwisko: { equals: nazwisko, mode: "insensitive" },
        imie: { equals: imie, mode: "insensitive" },
      },
    });
    if (existing) {
      console.log(`[EXISTS] ${nazwisko} ${imie} (ID ${existing.id}) — pomijam`);
      // Still mark as wProcesie
      if (APPLY && !existing.wProcesie) {
        await db.fdkForeigner.update({ where: { id: existing.id }, data: { wProcesie: true } });
      }
      continue;
    }

    // Get relative's data to pre-fill citizenship/DOB if available
    let prefillData = {};
    if (relativeId) {
      const relative = await db.fdkForeigner.findUnique({
        where: { id: relativeId },
        select: { obywatelstwo: true },
      });
      if (relative?.obywatelstwo) {
        prefillData.obywatelstwo = relative.obywatelstwo;
      }
    }

    if (APPLY) {
      const newProfile = await db.fdkForeigner.create({
        data: {
          nazwisko: nazwisko,
          imie: imie,
          wProcesie: true,
          ...prefillData,
        },
      });
      console.log(`[CREATED] ${nazwisko} ${imie} → ID ${newProfile.id}${prefillData.obywatelstwo ? ` (obyw: ${prefillData.obywatelstwo})` : ""}`);
      created++;

      // Log creation
      await db.fdkChangeLog.create({
        data: {
          foreignerId: newProfile.id,
          changedBy: CHANGED_BY,
          field: "profile_created",
          oldValue: null,
          newValue: `Utworzono profil z listy TRC (114 osób)${relativeId ? `. Krewny: ID ${relativeId}` : ""}`,
        },
      });

      // Reassign family attachments from relative's profile
      if (relativeId) {
        const relativeAttachments = await db.fdkAttachment.findMany({
          where: { foreignerId: relativeId },
        });

        for (const att of relativeAttachments) {
          if (attachmentMatchesPerson(att, imie, nazwisko)) {
            // Move attachment to new profile
            await db.fdkAttachment.update({
              where: { id: att.id },
              data: {
                foreignerId: newProfile.id,
                folder: "wazne",
                opis: att.opis?.startsWith("\u26a0") ? null : att.opis, // clear "different person" warning
              },
            });
            console.log(`  [MOVED] ${att.nazwaPliku} → ID ${newProfile.id}`);
            reassigned++;

            // Log
            await db.fdkChangeLog.create({
              data: {
                foreignerId: newProfile.id,
                changedBy: CHANGED_BY,
                field: "attachment_reassigned",
                oldValue: `foreigner_id=${relativeId}`,
                newValue: `Przeniesiono załącznik "${att.nazwaWyswietlana}" z profilu krewnego (ID ${relativeId})`,
              },
            });
          }
        }
      }
    } else {
      console.log(`[CREATE] ${nazwisko} ${imie}${relativeId ? ` (krewny: ID ${relativeId})` : ""}${prefillData.obywatelstwo ? ` (obyw: ${prefillData.obywatelstwo})` : ""}`);
      created++;

      // Check what attachments would be reassigned
      if (relativeId) {
        const relativeAttachments = await db.fdkAttachment.findMany({
          where: { foreignerId: relativeId },
        });
        const matches = relativeAttachments.filter((a) => attachmentMatchesPerson(a, imie, nazwisko));
        if (matches.length > 0) {
          for (const m of matches) {
            console.log(`  [MOVE] ${m.nazwaPliku}${m.opis ? ` (${m.opis.slice(0, 50)})` : ""}`);
            reassigned++;
          }
        } else {
          console.log(`  (brak pasujących załączników do przeniesienia)`);
        }
      }
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Profile do utworzenia: ${created}`);
  console.log(`Załączniki do przeniesienia: ${reassigned}`);
  if (!APPLY) {
    console.log(`\nUruchom z --apply żeby zastosować zmiany.`);
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
