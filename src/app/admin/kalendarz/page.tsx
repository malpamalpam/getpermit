import { Container } from "@/components/ui/Container";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CalendarView } from "@/components/admin/CalendarView";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = {
  title: "Kalendarz — Panel Admin",
  robots: { index: false, follow: false },
};

export default async function CalendarPage() {
  const user = await requireAdmin();

  // Fetch calendar events for the current and next 2 months
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 3, 0);

  const events = await db.calendarEvent.findMany({
    where: {
      eventDate: { gte: start, lte: end },
    },
    orderBy: { eventDate: "asc" },
  });

  // Fetch document expiries for the calendar overlay
  const foreigners = await db.fdkForeigner.findMany({
    include: {
      employmentBases: {
        where: {
          dataDo: { gte: start, lte: end },
          status: { in: ["AKTYWNE", "W_TRAKCIE"] },
        },
      },
    },
  });

  const TYPE_LABELS: Record<string, string> = {
    ZEZWOLENIE: "Zezwolenie",
    OSWIADCZENIE: "Oświadczenie",
    KARTA_POBYTU: "Karta pobytu",
    BLUE_CARD: "Blue Card",
    ZGLOSZENIE_UA: "Zgłoszenie UA",
  };

  const documentExpiries: { foreignerName: string; typLabel: string; dataDo: Date }[] = [];

  for (const f of foreigners) {
    for (const b of f.employmentBases) {
      if (!b.dataDo) continue;
      documentExpiries.push({
        foreignerName: `${f.imie ?? ""} ${f.nazwisko}`.trim(),
        typLabel: TYPE_LABELS[b.typ] ?? b.typ,
        dataDo: b.dataDo,
      });
    }
    // Add residence permit expiry
    if (f.decyzjaPobytowaDo && f.decyzjaPobytowaDo >= start && f.decyzjaPobytowaDo <= end) {
      documentExpiries.push({
        foreignerName: `${f.imie ?? ""} ${f.nazwisko}`.trim(),
        typLabel: f.typDokumentuPobytowego ?? "Decyzja pobytowa",
        dataDo: f.decyzjaPobytowaDo,
      });
    }
  }

  // Fetch all foreigners for the dropdown in event creation
  const allForeigners = await db.fdkForeigner.findMany({
    select: { id: true, imie: true, nazwisko: true },
    orderBy: { nazwisko: "asc" },
  });

  const foreignerList = allForeigners.map((f) => ({
    id: f.id,
    name: `${f.imie ?? ""} ${f.nazwisko}`.trim(),
  }));

  return (
    <>
      <AdminHeader user={user} active="calendar" />
      <Container className="py-8">
        <h1 className="mb-6 font-display text-3xl font-extrabold text-primary">Kalendarz</h1>
        <CalendarView
          events={events}
          documentExpiries={documentExpiries}
          foreigners={foreignerList}
        />
      </Container>
    </>
  );
}
