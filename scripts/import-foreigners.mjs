/**
 * Import foreigners from CSV (pasted from XLSX) into FDK database.
 * Usage: node scripts/import-foreigners.mjs
 *
 * Reads the CSV list, checks who already exists (by imie+nazwisko),
 * creates missing records, prints report.
 *
 * Requires DATABASE_URL in .env.local
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

// CSV data — paste from the XLSX export
const CSV_DATA = `imie,nazwisko,obywatelstwo
Kateryna,Dubrovina,Ukraina
Oleh,Rula,Ukraina
Valentina,Mukher,Rosja
Barrie,Hebb,Kanada
Valentin,Frolovsky,Bialorus
Nastassia,Lutskaya,Bialorus
Katsiaryna,Darashenka,Bialorus
Timothy,Crooks,Nowa Zelandia
Tinomudashe Hapson,Marecha,Zimbabwe
Aleksandr,Meniukov,Rosja
Konaye,Jajula,Republika Poludniowej Afryki
Catherine,Orsmond,Republika Poludniowej Afryki
Denys,Pozniak,Ukraina
Christopher,Stennett,Wielka Brytania
Jun,Akagawa,Japonia
Heather,Ndlovu Jasi,Zimbabwe
Artur,Hinko,Bialorus
James,Waygood,
Oksana,Shchukina,Rosja
Hanna,Mamedava,Bialorus
Hanna,Milasheuskaya,Bialorus
Mzwandile,Nyoni,Zimbabwe
Johanna,du Toit,Republika Poludniowej Afryki
Julia,Szalach,
Sayyed Seraj,Amini Ziabari,Iran
Alana,Matthews,Republika Poludniowej Afryki
Maryna,Markava,Bialorus
Yauhen,Dziachek,Bialorus
Stanislau,Piashko,Bialorus
Rita,Rajoo,Singapur
Samuel,Durrell,Wielka Brytania
Mykola,Kabanov,Ukraina
Svetlana,Zelenskaia,Kirgistan
Viktor,Tsedryk,Ukraina
Tiffany,Rafter,Republika Poludniowej Afryki
Fakhri,Afrasiyabov,Azerbejdzan
Elena,Vardentska,Rosja
Ayomikun,Olatunji,Nigeria
Fortune,Zviregei,Zimbabwe
Victor,Kholov,Bialorus
Sergei,Kapochkin,Rosja
Michael,do Carmo Fernandes,Portugalia
Yuliia,Konopatska,Ukraina
Marcel,Burger,Republika Poludniowej Afryki
Dean,Spykerman,Republika Poludniowej Afryki
Rafal,Sieradzki,
Anna,Cherevko,Ukraina
Anna,Abramova,Ukraina
Daniel,Daramola,Nigeria
Haydn Ley,Maxwell,Wielka Brytania
Viktoriia,Hrankina,Ukraina
Mariia,Iakovleva,Rosja
Katsiaryna,Sarokina,Bialorus
Marek,Paziewski,
Olena,Stoliar,Ukraina
Ganna,Mak,Ukraina
Anastasiya,Kanarska,Ukraina
Anastasia,McMillan,Rosja
Alina,Gaidukova,Bialorus
Anastasiia,Zamilova,Rosja
Maryna,Paziura,Ukraina
Olha,Yablunovska,Ukraina
Olga,Sikora,
Oleksandr,Khomenko,Ukraina
Marharyta,Shauchuk,Bialorus
Iryna,Kachurovska,Ukraina
Aleksandr,Shkadinski,Bialorus
Nataliia,Bielichkova,Ukraina
Karolina,Petrilovska,Litwa
Mikalai,Sasau,Bialorus
Illia,Sukhostavskyi,Ukraina
Dzmitry,Dryk,Bialorus
Andrei,Voitau,Bialorus
Mitchell,Welle,Stany Zjednoczone
Gamuchirayi,Zhuwawu,Zimbabwe
Vladyslav,Baluiev,Ukraina
Viktoriia,Baluieva,Ukraina
Anna,Tsabak,Ukraina
Renata,Serebrennikova,Ukraina
Daniil,Disterhov,Ukraina
Nykyta,Pfaif,Ukraina
Dmytro,Kalinin,Ukraina
Volodymyr,Stroia,Ukraina
Bernard,Hudzik,
Yelizaveta,Kliuchnikava,Bialorus
Dzmitry,Rubashka,Bialorus
Chelsea,Marange,Zimbabwe
Chelsea,Breakfast,Zimbabwe
Krystsina,Misura,Bialorus
Sofiya,Voytukhova,Rosja
Pavel,Yanushka,Bialorus
Nelisa,Nkosi,Republika Poludniowej Afryki
Vasyl,Lazebnyk,Ukraina
Matthew,Hammond,Wielka Brytania
Karalina,Baranouskaya,Bialorus
Tanmay,Naskar,Indie
Ina,Hrabarenka,Bialorus
Bohdan,Ovsiichuk,Ukraina
Vladyslav,Zholubov,Ukraina
Antanina,Paulouskaya,Bialorus
Hanna,Mishyna,Bialorus
Iryna,Antonava,Bialorus
Svitlana,Borovyk,Ukraina
Vladyslav,Kryshtal,Ukraina
Jacqueline,Hanson,Kanada
Fergus,Dunne,Irlandia
Chukwuemeka,Nwankpa,Nigeria
Viachaslau,Baranouski,Bialorus
Kostiantyn,Rudenko,Ukraina
Mikita,Mayorau,Bialorus
Engeline,Munhenzva,Zimbabwe
Irina,Maximova,Rosja
Faig,Mammadov,Azerbejdzan
Inga,Cherepanova,Rosja
Juan Jose,Diaz Hurtado,Hiszpania
Svitlana,Pysmenna,Ukraina
Alena,Mekh,Bialorus
Tatsiana,Yermalitskaya,Bialorus
Rodrigo,Arenas-Catalan,Chile
Lada,Vakar,Rosja
Ruslan,Sokolovskii,Rosja
Laura,Octavio Ruiz,Hiszpania
Julian,March,Wielka Brytania
Karolina,Kuznetsova,Ukraina
Aliaksei,Bahamolau,Bialorus
Natalia,Shelest,Ukraina
Ekatherina,Pankevich,Bialorus
Oleksii,Murzin,Ukraina
Valeryia,Voitava,Bialorus
Irina,Vasina,Rosja
Andrei,Doroshenko,Rosja
Lina,Kravchuk,Ukraina
Lawrence,Sumpter-Reynolds,Irlandia
Elvira,Koroleva,Bialorus
Gordon Ezekiel James,Freeman,Wielka Brytania
Ihor,Shykalov,Ukraina
Volha,Sakalova,Bialorus
Darya,Bahniuk,Bialorus
Andrei,Venski,Bialorus
Elen,Gabrielyan,Armenia
Conrad,Barnard,Republika Poludniowej Afryki
Joel,Ntoto,Kongo
Nyaradzo Tsitsi,Matiza,Zimbabwe
Ahra,Lee,Korea Poludniowa
Charity Ejoumeyetei,Markilolo,Nigeria
Valeriya,Dzboeva,Rosja
Margarita,Kazmina,Rosja
Tyler,Mikulec,Stany Zjednoczone
Ransome,Nyandebvu,Zimbabwe
Oleksandr,Voloshchenko,Ukraina
Christian,van Reenen,Republika Poludniowej Afryki
Nikolai,Kazakov,Rosja
Alexey,Garny,Bialorus
Leanid,Pazharytski,Bialorus
Pavel,Shabarkin,Ukraina
Natalia,Lev,Ukraina
Denis,Sadomovskii,Rosja
Nadiia,Lobashchuk,Ukraina
Bogdan,Lysenko,Ukraina
Mariia,Lytvynenko,Ukraina
Kerim,Abubakarov,Rosja
Elena,Bevz,Rumunia
Natallia,Lysaya,Bialorus
Kateryna,Diahleva,Ukraina
Joel,Silverman,Stany Zjednoczone
Kamran,Akhundov,Azerbejdzan
Denys,Stokovskyi,Ukraina
Veronika,Stokovska,Estonia
Evgeny,Zelenkevich,Bialorus
Nadzeya,Klimovich,Bialorus
Sergii,Romaniuk,Ukraina
Oleksandr,Tymchenko,Ukraina
Brian,Waweru,Kenia
Jason,Munro,Australia
Chiril,Cepicov,Rumunia
Viktor,Sytnik,Ukraina
Miguel,Martin,Argentyna
Yuliana,Rudaya,Bialorus
Daria,Lyakh,Rosja
Yuliya,Murashka,Bialorus
Elizaveta,Loshak,Bialorus
Igor,Efremov,Rosja
Murad,Aliyev,Azerbejdzan
Yuliia,Semenko,Ukraina
Viktor,Luzin,Rosja`;

async function main() {
  const lines = CSV_DATA.trim().split("\n").slice(1); // skip header
  console.log(`\n=== Import cudzoziemcow ===`);
  console.log(`Rekordow w pliku: ${lines.length}\n`);

  // Get all existing foreigners
  const existing = await prisma.fdkForeigner.findMany({
    select: { id: true, imie: true, nazwisko: true, obywatelstwo: true },
  });
  console.log(`Istniejacych w bazie: ${existing.length}\n`);

  // Build lookup (lowercase imie+nazwisko)
  const existingMap = new Map();
  for (const f of existing) {
    const key = `${(f.imie ?? "").toLowerCase()}|${f.nazwisko.toLowerCase()}`;
    existingMap.set(key, f);
  }

  let created = 0;
  let skipped = 0;
  const skippedList = [];
  const createdList = [];

  for (const line of lines) {
    const parts = line.split(",");
    const imie = parts[0]?.trim();
    const nazwisko = parts[1]?.trim();
    const obywatelstwo = parts[2]?.trim() || null;

    if (!nazwisko) continue;

    const key = `${(imie ?? "").toLowerCase()}|${nazwisko.toLowerCase()}`;

    if (existingMap.has(key)) {
      const ex = existingMap.get(key);
      skipped++;
      skippedList.push(`  [SKIP] ${imie} ${nazwisko} (id=${ex.id})`);

      // Update obywatelstwo if missing in DB but present in CSV
      if (obywatelstwo && !ex.obywatelstwo) {
        await prisma.fdkForeigner.update({
          where: { id: ex.id },
          data: { obywatelstwo },
        });
        skippedList[skippedList.length - 1] += ` → uzupelniono obywatelstwo: ${obywatelstwo}`;
      }
      continue;
    }

    // Create new foreigner
    const created_rec = await prisma.fdkForeigner.create({
      data: {
        imie: imie || null,
        nazwisko,
        obywatelstwo,
      },
    });
    created++;
    createdList.push(`  [NEW] ${imie} ${nazwisko} (id=${created_rec.id}) ${obywatelstwo ?? ""}`);
  }

  console.log(`--- Pominieci (juz w bazie): ${skipped} ---`);
  for (const s of skippedList) console.log(s);

  console.log(`\n--- Utworzeni: ${created} ---`);
  for (const c of createdList) console.log(c);

  console.log(`\n=== Gotowe: ${created} dodanych, ${skipped} istniejacych ===\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
