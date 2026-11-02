import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function show(id, name) {
  const f = await db.fdkForeigner.findUnique({
    where: { id },
    include: { employmentBases: { orderBy: { dataOd: "desc" } } },
  });
  console.log(`\n=== ${name} (id=${id}) ===`);
  for (const b of f.employmentBases) {
    console.log(`  #${b.id} ${b.typ} ${b.status} stawka=${b.stawka != null ? Number(b.stawka) : "-"} stan="${(b.stanowisko ?? "").substring(0, 40)}"`);
  }
}

await show(211, "Afrasiyabov");
await show(378, "Abrahimovich");
await show(379, "Abramchuk");

// Check admins
console.log("\n=== Konta admin ===");
const admins = await db.user.findMany({ where: { role: "ADMIN" } });
for (const a of admins) {
  console.log(`  ${a.email} role=${a.role}`);
}

await db.$disconnect();
