/**
 * Import ALL foreigners from the full XLSX export into FDK database.
 * Usage: node scripts/import-foreigners-full.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CSV_DATA = `Kateryna,Dubrovina,Ukraina
Oleh,Rula,Ukraina
Valentina,Mukher,Rosja
Barrie,Hebb,Kanada
Malvina,Pahari,Moldawia
Diego,Marin Santos,Brazylia
Valentin,Frolovsky,Bialorus
Nastassia,Lutskaya,Bialorus
Iryna,Brouka,Bialorus
Katsiaryna,Darashenka,Bialorus
Victor,Oriaku,Nigeria
Aleh,Luchkouski,Bialorus
Timothy,Crooks,Nowa Zelandia
Tinomudashe Hapson,Marecha,Zimbabwe
Aleksandr,Meniukov,Rosja
Mikalai,Pakhadzenka,Bialorus
Konaye,Jajula,Republika Poludniowej Afryki
Catherine,Orsmond,Republika Poludniowej Afryki
Denys,Pozniak,Ukraina
Olga,Kiba,Rosja
Valeryia,Lipskaya,Bialorus
Karyna,Shymanskaya,Bialorus
Lydia,Rice,Wielka Brytania
Johanna,Nashandi,Namibia
Anastasiya,Piatrovich,Bialorus
Aleh,Filatau,Bialorus
Christopher,Stennett,Wielka Brytania
Jun,Akagawa,Japonia
Heather,Ndlovu Jasi,Zimbabwe
Artur,Hinko,Bialorus
Aleksandr,Sidorov,Rosja
Florence,Daniels,Zambia
James,Waygood,
Volha,Vouna,Bialorus
Oksana,Shchukina,Rosja
Kirill,Abrazhevich,Bialorus
Hanna,Mamedava,Bialorus
Hanna,Milasheuskaya,Bialorus
Mzwandile,Nyoni,Zimbabwe
Johanna,du Toit,Republika Poludniowej Afryki
Julia,Szalach,
Vladislav,Medved,Bialorus
Sayyed Seraj,Amini Ziabari,Iran
Alana,Matthews,Republika Poludniowej Afryki
Kanstantsin,Shchuchkin,Bialorus
Maryia,Zaiko,Bialorus
Maryna,Markava,Bialorus
Yauhen,Dziachek,Bialorus
Darya,Rakhuba,Bialorus
Anastasiia,Olshanskaia,Rosja
Nessrine,Mansouri,Tunezja
Christopher,Unger,Kanada
Nadzeya,Zharnak,Bialorus
Stanislau,Piashko,Bialorus
Rita,Rajoo,Singapur
Ilya,Tarasevich,Bialorus
Samuel,Durrell,Wielka Brytania
Mykola,Kabanov,Ukraina
Kyrylo,Kahan,Ukraina
Svetlana,Zelenskaia,Kirgistan
Viktor,Tsedryk,Ukraina
Tiffany,Rafter,Republika Poludniowej Afryki
Uladzimir,Topaleu,Bialorus
Fakhri,Afrasiyabov,Azerbejdzan
Elena,Vardentska,Rosja
Ayomikun,Olatunji,Nigeria
Aliaksandr,Bandarenka,Bialorus
Viktar,Valovich,Bialorus
Hanna,Kastunova,Bialorus
Fortune,Zviregei,Zimbabwe
Victor,Kholov,Bialorus
Sergei,Kapochkin,Rosja
Michael,do Carmo Fernandes,Portugalia
Yuliia,Konopatska,Ukraina
Nyasha,Ndigwirei,Zimbabwe
Marcel,Burger,Republika Poludniowej Afryki
Liliya,Zhukava,Bialorus
Dean,Spykerman,Republika Poludniowej Afryki
Burak,Isik,Turcja
Wandile,Mkhize,Republika Poludniowej Afryki
Rafal,Sieradzki,
Alena,Smolik,Bialorus
Danny Eu Huat,Khoo,Australia
Nina,Tsikhanovich,Bialorus
Anna,Cherevko,Ukraina
Anna,Abramova,Ukraina
Daniel,Daramola,Nigeria
Haydn Ley,Maxwell,Wielka Brytania
Viktoriia,Hrankina,Ukraina
Mariia,Iakovleva,Rosja
Elina,Hlushakova,Bialorus
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
Anton,Morozov,Rosja
Mikalai,Sasau,Bialorus
Illia,Sukhostavskyi,Ukraina
Dzmitry,Dryk,Bialorus
Andrei,Voitau,Bialorus
Mitchell,Welle,Stany Zjednoczone
Anatoli,Sukhan,Bialorus
Gamuchirayi,Zhuwawu,Zimbabwe
Vladyslav,Baluiev,Ukraina
Viktoriia,Baluieva,Ukraina
Anna,Tsabak,Ukraina
Ilya,Lomats,Bialorus
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
Mikhail,Shapialevich,Bialorus
Krystsina,Misura,Bialorus
Sofiya,Voytukhova,Rosja
Pavel,Yanushka,Bialorus
Nelisa,Nkosi,Republika Poludniowej Afryki
Yaraslau,Borzdy,Bialorus
Linar,Gimashev,Rosja
Vasyl,Lazebnyk,Ukraina
Matthew,Hammond,Wielka Brytania
Siarhei,Astakhau,Bialorus
Karalina,Baranouskaya,Bialorus
Tanmay,Naskar,Indie
Ina,Hrabarenka,Bialorus
Yury,Zhdaniuk,Bialorus
Bohdan,Ovsiichuk,Ukraina
Vladyslav,Zholubov,Ukraina
Antanina,Paulouskaya,Bialorus
Hanna,Mishyna,Bialorus
Iryna,Antonava,Bialorus
Svitlana,Borovyk,Ukraina
Vladyslav,Kryshtal,Ukraina
Jacqueline,Hanson,Kanada
Pavel,Sytau,Bialorus
Fergus,Dunne,Irlandia
Chukwuemeka,Nwankpa,Nigeria
Dzmitry,Rudz,Bialorus
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
Stanislau,Hnip,Bialorus
Rodrigo,Arenas-Catalan,Chile
Jagor,Kushnir,Izrael
Lada,Vakar,Rosja
Ruslan,Sokolovskii,Rosja
Ivan,Mitsura,Bialorus
Yauheni,Asetski,Bialorus
Dzmitry,Pranchuk,Bialorus
Yury,Vashchylau,Bialorus
Laura,Octavio Ruiz,Hiszpania
Julian,March,Wielka Brytania
Karolina,Kuznetsova,Ukraina
Barys,Kliuchnikau,Bialorus
Aliaksei,Bahamolau,Bialorus
Natalia,Shelest,Ukraina
Ekatherina,Pankevich,Bialorus
Siarhei,Pankevich,Bialorus
Yauhen,Aksiutsin,Bialorus
Oleksii,Murzin,Ukraina
Valeryia,Voitava,Bialorus
Irina,Vasina,Rosja
Andrei,Doroshenko,Rosja
Aliaksei,Skuratovich,Bialorus
Lina,Kravchuk,Ukraina
Lawrence,Sumpter-Reynolds,Irlandia
Maksim,Borzdov,Bialorus
Elvira,Koroleva,Bialorus
Gordon Ezekiel James,Freeman,Wielka Brytania
Ihor,Shykalov,Ukraina
Volha,Sakalova,Bialorus
Darya,Bahniuk,Bialorus
Barys,Sidareika,Bialorus
Andrei,Venski,Bialorus
Elen,Gabrielyan,Armenia
Conrad,Barnard,Republika Poludniowej Afryki
Mikhail,Anikanov,Rosja
Iryna,Shymanel,Bialorus
Joel,Ntoto,Kongo
Anastasiia,Nekozakova,Rosja
Nyaradzo Tsitsi,Matiza,Zimbabwe
Ahra,Lee,Korea Poludniowa
Daniel,Abraham,Malezja
Charity Ejoumeyetei,Markilolo,Nigeria
Valeriya,Dzboeva,Rosja
Margarita,Kazmina,Rosja
Tyler,Mikulec,Stany Zjednoczone
Aleksei,Kruglov,Rosja
Ransome,Nyandebvu,Zimbabwe
Viachaslau,Kukhtsiuk,Bialorus
Oleksandr,Voloshchenko,Ukraina
Pavel,Malinovski,Bialorus
Ihar,Tsudzin,Bialorus
Christian,van Reenen,Republika Poludniowej Afryki
Joseph,Regan,Wielka Brytania
Nikolai,Kazakov,Rosja
Alexey,Garny,Bialorus
Leanid,Pazharytski,Bialorus
Pavel,Shabarkin,Ukraina
Natalia,Lev,Ukraina
Denis,Sadomovskii,Rosja
Jacob,Hughes,Wielka Brytania
Nadiia,Lobashchuk,Ukraina
Bogdan,Lysenko,Ukraina
Mariia,Lytvynenko,Ukraina
Kerim,Abubakarov,Rosja
Elena,Bevz,Rumunia
Natallia,Lysaya,Bialorus
Daniel,Saifulin,Kirgistan
Kateryna,Diahleva,Ukraina
Yelisei,Fedarynchyk,Bialorus
Joel,Silverman,Stany Zjednoczone
Kamran,Akhundov,Azerbejdzan
Denys,Stokovskyi,Ukraina
Veronika,Stokovska,Estonia
Alexandra,Nossoff,Bialorus
Evgeny,Zelenkevich,Bialorus
Nadzeya,Klimovich,Bialorus
Marharyta,Sidarenka,Bialorus
Sergii,Romaniuk,Ukraina
Philippus,Prinsloo,Republika Poludniowej Afryki
Oleksandr,Tymchenko,Ukraina
Volha,Kalinouskaya,Bialorus
Anastasiya,Shaukun,Bialorus
Brian,Waweru,Kenia
Jason,Munro,Australia
Chiril,Cepicov,Rumunia
Beksultan,Nazaraliev,Rosja
Viktor,Sytnik,Ukraina
Miguel,Martin,Argentyna
Yuliana,Rudaya,Bialorus
Daria,Lyakh,Rosja
Christian,Weigman,Stany Zjednoczone
Yuliya,Murashka,Bialorus
Elizaveta,Loshak,Bialorus
Igor,Efremov,Rosja
Murad,Aliyev,Azerbejdzan
Tatsiana,Nikitsenka,Bialorus
Yuliia,Semenko,Ukraina
Viktor,Luzin,Rosja`;

async function main() {
  const lines = CSV_DATA.trim().split("\n");
  console.log(`\n=== Import cudzoziemcow (pelna lista XLSX) ===`);
  console.log(`Rekordow w pliku: ${lines.length}\n`);

  const existing = await prisma.fdkForeigner.findMany({
    select: { id: true, imie: true, nazwisko: true, obywatelstwo: true },
  });
  console.log(`Istniejacych w bazie: ${existing.length}\n`);

  const existingMap = new Map();
  for (const f of existing) {
    const key = `${(f.imie ?? "").toLowerCase().trim()}|${f.nazwisko.toLowerCase().trim()}`;
    existingMap.set(key, f);
  }

  let created = 0;
  let skipped = 0;

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
      if (obywatelstwo && !ex.obywatelstwo) {
        await prisma.fdkForeigner.update({ where: { id: ex.id }, data: { obywatelstwo } });
        console.log(`  [SKIP+UPD] ${imie} ${nazwisko} (id=${ex.id}) → obywatelstwo: ${obywatelstwo}`);
      }
      continue;
    }

    const rec = await prisma.fdkForeigner.create({
      data: { imie: imie || null, nazwisko, obywatelstwo },
    });
    created++;
    console.log(`  [NEW] ${imie} ${nazwisko} (id=${rec.id}) ${obywatelstwo ?? ""}`);
  }

  console.log(`\n=== Gotowe: ${created} dodanych, ${skipped} istniejacych ===\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
