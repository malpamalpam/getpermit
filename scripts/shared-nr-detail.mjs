/**
 * Detailed report for shared nrDecyzji: names, DOB, filenames, recommendation.
 */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const pairs = [
    { nr: "DPU.420.4028.2023", profiles: [204, 863] },
    { nr: "OB-II.6151.2718.2022.JKO", profiles: [985, 986] },
  ];

  for (const { nr, profiles } of pairs) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`  Nr decyzji: ${nr}`);
    console.log(`${"=".repeat(60)}`);

    for (const pid of profiles) {
      const f = await db.fdkForeigner.findUnique({
        where: { id: pid },
        include: {
          employmentBases: { where: { nrDecyzji: nr } },
          attachments: true,
        },
      });
      if (!f) { console.log(`  Profil ${pid}: NIE ZNALEZIONY`); continue; }

      console.log(`\n  Profil ${pid}:`);
      console.log(`    Imię: ${f.imie ?? "-"}`);
      console.log(`    Nazwisko: ${f.nazwisko}`);
      console.log(`    Data urodzenia: ${f.dataUrodzenia?.toISOString().slice(0, 10) ?? "-"}`);
      console.log(`    PESEL: ${f.pesel ?? "-"}`);
      console.log(`    Paszport: ${f.nrPaszportu ?? "-"}`);
      console.log(`    Obywatelstwo: ${f.obywatelstwo ?? "-"}`);

      for (const b of f.employmentBases) {
        console.log(`    Podstawa #${b.id}: ${b.typ}, od=${b.dataOd?.toISOString().slice(0,10) ?? "-"}, do=${b.dataDo?.toISOString().slice(0,10) ?? "-"}`);
        if (b.sourceAttachmentId) {
          const att = f.attachments.find(a => a.id === b.sourceAttachmentId);
          console.log(`      Załącznik: ${att?.nazwaPliku ?? `id=${b.sourceAttachmentId}`}`);
        }
      }
    }

    // Recommendation
    const [f1, f2] = await Promise.all(profiles.map(id =>
      db.fdkForeigner.findUnique({ where: { id }, select: { id: true, nazwisko: true, imie: true, dataUrodzenia: true } })
    ));
    const sameSurname = f1?.nazwisko?.toLowerCase() === f2?.nazwisko?.toLowerCase();
    const sameDob = f1?.dataUrodzenia?.toISOString() === f2?.dataUrodzenia?.toISOString();

    console.log(`\n  REKOMENDACJA:`);
    if (sameSurname && sameDob) {
      console.log(`    → Prawdopodobnie TA SAMA OSOBA (to samo nazwisko + DOB). Rozważyć SCALENIE profili.`);
    } else if (sameSurname) {
      console.log(`    → To samo nazwisko, różne DOB — prawdopodobnie RODZINA. Sprawdzić, czy dokument podpięty pod właściwy profil.`);
    } else {
      console.log(`    → Różne nazwiska — prawdopodobnie CUDZY DOKUMENT podpięty pod zły profil. Przepiąć na właściwą osobę.`);
    }
  }

  await db.$disconnect();
}

main().catch(console.error);
