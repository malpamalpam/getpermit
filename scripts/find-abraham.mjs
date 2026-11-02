import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const r = await db.fdkForeigner.findMany({
  where: { nazwisko: { contains: "Abraham", mode: "insensitive" } },
  select: { id: true, imie: true, nazwisko: true },
});
console.log(JSON.stringify(r));
await db.$disconnect();
