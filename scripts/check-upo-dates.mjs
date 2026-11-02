import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const foreigners = await db.fdkForeigner.findMany({
    where: { upoDoreczone: { not: null } },
    select: { id: true, imie: true, nazwisko: true, upoDoreczone: true, upoUwagi: true },
    orderBy: { nazwisko: "asc" },
  });

  for (const f of foreigners) {
    const d = f.upoDoreczone;
    const iso = d.toISOString();
    const utcDay = `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${d.getUTCFullYear()}`;
    const localDay = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
    const uwagi = (f.upoUwagi ?? "").match(/doręczony\s+([\d.]+)/)?.[1] ?? "—";
    console.log(`id=${f.id} ${(f.imie + " " + f.nazwisko).padEnd(30)} ISO=${iso}  UTC=${utcDay}  Local=${localDay}  Uwagi=${uwagi}`);
  }
  await db.$disconnect();
}
main();
