import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const ids = [927, 616, 704, 721, 826, 230, 7, 326];

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
