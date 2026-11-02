import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const res = await db.fdkResidenceBasis.findMany({
  where: { foreignerId: 28, nrDecyzji: "WSC-II-P.6151.82277.2024" },
  select: { id: true, typ: true, status: true, nrDecyzji: true, dataOd: true, dataDo: true },
});
console.log("Morozov residence bases (WSC-II-P.6151.82277.2024):");
console.log(JSON.stringify(res, null, 2));

// Also check ALL residence bases for Morozov
const all = await db.fdkResidenceBasis.findMany({
  where: { foreignerId: 28 },
  select: { id: true, typ: true, status: true, nrDecyzji: true, dataOd: true, dataDo: true },
});
console.log("\nAll Morozov residence bases:");
console.log(JSON.stringify(all, null, 2));

await db.$disconnect();
