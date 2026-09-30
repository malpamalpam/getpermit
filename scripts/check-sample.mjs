import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
// Test profiles from section D (acceptance tests)
// Hanson=280, Abrazhevich=63, Efremov=539, Pozniak=282, Akagawa=190
// Dryk=500, Arenas=472, Jasi=258, Stoliar=230, Kurei=704
const ids = [280, 63, 539, 282, 190, 500, 472, 258, 230, 704, 927, 326];

for (const id of ids) {
  const f = await db.fdkForeigner.findUnique({
    where: { id },
    include: {
      employmentBases: { orderBy: { dataOd: "desc" } },
      _count: { select: { attachments: true } },
    },
  });
  if (!f) continue;
  const wizaDo = f.wizaDo?.toISOString().slice(0, 10) ?? "-";
  console.log(`\n=== ${f.imie} ${f.nazwisko} id=${id} zal=${f._count.attachments} bases=${f.employmentBases.length} wizaDo=${wizaDo} ukr=${f.ochronaCzasowaUkr}`);
  for (const b of f.employmentBases.slice(0, 5)) {
    const od = b.dataOd?.toISOString().slice(0, 10) ?? "-";
    const doo = b.dataDo?.toISOString().slice(0, 10) ?? "-";
    const stan = b.stanowisko?.substring(0, 40) ?? "";
    console.log(`  #${b.id} ${b.typ} ${b.status} ${od} -> ${doo} ${stan}`);
  }
  if (f.employmentBases.length > 5) console.log(`  ... +${f.employmentBases.length - 5} more`);
}

await db.$disconnect();
