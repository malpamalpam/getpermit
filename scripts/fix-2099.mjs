import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // Check profile 341
  const f = await db.fdkForeigner.findUnique({
    where: { id: 341 },
    select: { id: true, imie: true, nazwisko: true, decyzjaPobytowaDo: true },
  });
  console.log(`Profil 341: ${f?.imie ?? ""} ${f?.nazwisko}`);
  console.log(`decyzjaPobytowaDo: ${f?.decyzjaPobytowaDo?.toISOString().slice(0,10) ?? "null"}`);

  // Find all bases with 2099
  const bases = await db.fdkEmploymentBase.findMany({
    where: { foreignerId: 341 },
    select: { id: true, typ: true, status: true, dataOd: true, dataDo: true, nrDecyzji: true },
    orderBy: { id: "asc" },
  });
  console.log("\nPodstawy:");
  for (const b of bases) {
    const od = b.dataOd?.toISOString().slice(0,10) ?? "null";
    const _do = b.dataDo?.toISOString().slice(0,10) ?? "null";
    const flag = _do.startsWith("2099") ? " *** 2099!" : "";
    console.log(`  #${b.id} ${b.typ} status=${b.status} od=${od} do=${_do} nr=${b.nrDecyzji ?? "-"}${flag}`);
  }

  // Also check globally for any 2099 dates
  console.log("\n=== Global: wszystkie podstawy z dataDo w 2099 ===");
  const all2099 = await db.fdkEmploymentBase.findMany({
    where: { dataDo: { gte: new Date("2099-01-01") } },
    include: { foreigner: { select: { id: true, nazwisko: true, imie: true } } },
  });
  for (const b of all2099) {
    console.log(`  profil ${b.foreigner.id} (${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}) #${b.id} ${b.typ}: dataDo=${b.dataDo?.toISOString().slice(0,10)}`);
  }

  // Also check decyzjaPobytowaDo = 2099
  console.log("\n=== Global: profile z decyzjaPobytowaDo w 2099 ===");
  const profiles2099 = await db.fdkForeigner.findMany({
    where: { decyzjaPobytowaDo: { gte: new Date("2099-01-01") } },
    select: { id: true, nazwisko: true, imie: true, decyzjaPobytowaDo: true },
  });
  for (const p of profiles2099) {
    console.log(`  profil ${p.id} (${p.imie ?? ""} ${p.nazwisko}): decyzjaPobytowaDo=${p.decyzjaPobytowaDo?.toISOString().slice(0,10)}`);
  }

  await db.$disconnect();
}
main().catch(console.error);
