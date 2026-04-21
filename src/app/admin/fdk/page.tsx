import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { FdkTable } from "@/components/admin/FdkTable";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { robots: { index: false, follow: false } };

export default async function FdkPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    const { notFound } = await import("next/navigation");
    notFound();
  }

  const permits = await db.fdkPermit.findMany({
    orderBy: { dataDo: "asc" },
  });

  const serialized = permits.map((p) => ({
    id: p.id,
    nazwisko: p.nazwisko,
    imie: p.imie,
    typDokumentu: p.typDokumentu,
    dataOd: p.dataOd?.toISOString() ?? null,
    dataDo: p.dataDo?.toISOString() ?? null,
    decyzjaOdebrana: p.decyzjaOdebrana?.toISOString() ?? null,
  }));

  return (
    <>
      <AdminHeader user={user} active="fdk" />
      <Container className="py-10 md:py-14">
        <FdkTable permits={serialized} />
      </Container>
    </>
  );
}
