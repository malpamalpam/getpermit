import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const bases = await db.fdkEmploymentBase.findMany({ where: { typ: "DOSTEP_DYPLOM_PL" } });
console.log(`DOSTEP_DYPLOM_PL w bazie: ${bases.length}`);
for (const b of bases) {
  const f = await db.fdkForeigner.findUnique({ where: { id: b.foreignerId }, select: { imie: true, nazwisko: true } });
  console.log(`  #${b.id} id=${b.foreignerId} ${f?.imie} ${f?.nazwisko} firma="${b.firma}" status=${b.status}`);
}
await db.$disconnect();
