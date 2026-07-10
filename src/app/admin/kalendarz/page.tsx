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

  // Fetch calendar events for a wide range (3 years: last year → 2 years ahead)
  // This ensures document expiries far in the future (e.g. 2-year oświadczenia) are visible
  const now = new Date();
  const start = new Date(now.getFullYear() - 1, 0, 1);
  const end = new Date(now.getFullYear() + 2, 11, 31);

  const rawEvents = await db.calendarEvent.findMany({
    where: {
      eventDate: { gte: start, lte: end },
    },
    orderBy: { eventDate: "asc" },
  });

  // Serialize Date objects for client component
  const events = rawEvents.map((e) => ({
    ...e,
    eventDate: e.eventDate.toISOString(),
    doneAt: e.doneAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  // Fetch document expiries for the calendar overlay
  const foreigners = await db.fdkForeigner.findMany({
    include: {
      employmentBases: {
        where: {
          dataDo: { gte: start, lte: end },
          status: { notIn: ["UCHYLONE", "UMORZONE"] },
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

  // Reminder lead times per document type (days before expiry)
  const REMINDER_DAYS: Record<string, number> = {
    OSWIADCZENIE: 60,
    ZEZWOLENIE: 180,
    KARTA_POBYTU: 90,
    BLUE_CARD: 180,
    ZGLOSZENIE_UA: 60,
    DECYZJA_POBYTOWA: 90,
  };

  const REMINDER_MESSAGES: Record<string, string> = {
    OSWIADCZENIE: "weryfikacja uzyskania nowego",
    ZEZWOLENIE: "weryfikacja wyrobienia nowego",
    KARTA_POBYTU: "weryfikacja przedłużenia",
    BLUE_CARD: "weryfikacja przedłużenia",
    ZGLOSZENIE_UA: "weryfikacja przedłużenia",
    DECYZJA_POBYTOWA: "weryfikacja przedłużenia pobytu",
  };

  const documentExpiries: { foreignerName: string; typLabel: string; typ: string; dataDo: string; reminderDate: string; daysLeft: number; reminderMessage: string; rodzajUmowy: string | null; baseId: number | null; notes: string | null }[] = [];

  for (const f of foreigners) {
    for (const b of f.employmentBases) {
      if (!b.dataDo) continue;
      const daysLeft = Math.ceil((b.dataDo.getTime() - now.getTime()) / 86400000);
      const leadDays = REMINDER_DAYS[b.typ] ?? 60;
      const reminderDate = new Date(b.dataDo.getTime() - leadDays * 86400000);
      const name = `${f.imie ?? ""} ${f.nazwisko}`.trim();
      const message = REMINDER_MESSAGES[b.typ] ?? "weryfikacja";
      documentExpiries.push({
        foreignerName: name,
        typLabel: TYPE_LABELS[b.typ] ?? b.typ,
        typ: b.typ,
        dataDo: b.dataDo.toISOString(),
        reminderDate: reminderDate.toISOString(),
        daysLeft,
        reminderMessage: `Koniec ${(TYPE_LABELS[b.typ] ?? b.typ).toLowerCase()} dla ${name} za ${Math.max(0, daysLeft)} dni — ${message}`,
        rodzajUmowy: b.rodzajUmowy ?? null,
        baseId: b.id,
        notes: b.uwagi ?? null,
      });
    }
    // Add residence permit expiry
    if (f.decyzjaPobytowaDo && f.decyzjaPobytowaDo >= start && f.decyzjaPobytowaDo <= end) {
      const daysLeft = Math.ceil((f.decyzjaPobytowaDo.getTime() - now.getTime()) / 86400000);
      const leadDays = REMINDER_DAYS.DECYZJA_POBYTOWA;
      const reminderDate = new Date(f.decyzjaPobytowaDo.getTime() - leadDays * 86400000);
      const name = `${f.imie ?? ""} ${f.nazwisko}`.trim();
      documentExpiries.push({
        foreignerName: name,
        typLabel: f.typDokumentuPobytowego ?? "Decyzja pobytowa",
        typ: "DECYZJA_POBYTOWA",
        dataDo: f.decyzjaPobytowaDo.toISOString(),
        reminderDate: reminderDate.toISOString(),
        daysLeft,
        reminderMessage: `Koniec decyzji pobytowej dla ${name} za ${Math.max(0, daysLeft)} dni — ${REMINDER_MESSAGES.DECYZJA_POBYTOWA}`,
        rodzajUmowy: null,
        baseId: null,
        notes: null,
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

  // Fetch staff for assignee dropdown
  const staffUsers = await db.user.findMany({
    where: { role: { in: ["STAFF", "ADMIN"] } },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: { firstName: "asc" },
  });
  const staffList = staffUsers.map((s) => ({
    id: s.id,
    name: `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim() || s.email,
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
          staffList={staffList}
        />
      </Container>
    </>
  );
}
