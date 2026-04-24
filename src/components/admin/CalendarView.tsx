"use client";

import { useState, useTransition } from "react";
import { createCalendarEventAction, deleteCalendarEventAction } from "@/lib/fdk-actions";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Trash2,
  Loader2,
  MapPin,
  Building2,
  User,
  Mail,
} from "lucide-react";

interface CalendarEventData {
  id: number;
  type: string;
  title: string;
  description: string | null;
  eventDate: Date;
  eventTime: string | null;
  place: string | null;
  organ: string | null;
  foreignerId: number | null;
  foreignerName: string | null;
  notes: string | null;
  emailSent: boolean;
  createdAt: Date;
}

interface DocumentExpiry {
  foreignerName: string;
  typLabel: string;
  dataDo: Date;
}

interface Props {
  events: CalendarEventData[];
  documentExpiries: DocumentExpiry[];
  foreigners: { id: number; name: string }[];
}

const TYPE_LABELS: Record<string, string> = {
  OFFICE_VISIT: "Wizyta w urzędzie",
  OFFICE_MEETING: "Spotkanie w biurze",
  OTHER: "Inne",
};

const TYPE_COLORS: Record<string, string> = {
  OFFICE_VISIT: "bg-blue-500",
  OFFICE_MEETING: "bg-green-500",
  OTHER: "bg-gray-500",
};

const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

const DAYS_PL = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function CalendarView({ events, documentExpiries, foreigners }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [form, setForm] = useState({
    type: "OFFICE_VISIT" as string,
    title: "",
    description: "",
    eventDate: "",
    eventTime: "",
    place: "",
    organ: "",
    foreignerId: 0,
    notes: "",
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevWeek = () => setCurrentDate(new Date(currentDate.getTime() - 7 * 86400000));
  const nextWeek = () => setCurrentDate(new Date(currentDate.getTime() + 7 * 86400000));

  // Build month grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
  const totalDays = lastDay.getDate();

  const days: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let i = 1; i <= totalDays; i++) days.push(new Date(year, month, i));
  while (days.length % 7 !== 0) days.push(null);

  // Build week view
  const weekStart = new Date(currentDate);
  const dayOfWeek = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - dayOfWeek);
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    weekDays.push(new Date(weekStart.getTime() + i * 86400000));
  }

  function getEventsForDay(day: Date) {
    return events.filter((e) => sameDay(new Date(e.eventDate), day));
  }

  function getExpiriesForDay(day: Date) {
    return documentExpiries.filter((e) => sameDay(new Date(e.dataDo), day));
  }

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await createCalendarEventAction(form as never);
      if (result.ok) {
        setShowForm(false);
        setForm({
          type: "OFFICE_VISIT", title: "", description: "", eventDate: "",
          eventTime: "", place: "", organ: "", foreignerId: 0, notes: "",
        });
        window.location.reload();
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Usunąć to wydarzenie?")) return;
    startTransition(async () => {
      await deleteCalendarEventAction(id);
      window.location.reload();
    });
  };

  const openFormForDate = (day: Date) => {
    setForm((prev) => ({ ...prev, eventDate: day.toISOString().slice(0, 10) }));
    setSelectedDate(day);
    setShowForm(true);
  };

  const today = new Date();
  const inputCls =
    "block w-full rounded-md border border-primary/15 bg-white px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20";

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={view === "month" ? prevMonth : prevWeek} className="rounded-lg border border-primary/15 p-2 hover:bg-primary/5">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="font-display text-xl font-bold text-primary">
            {view === "month"
              ? `${MONTHS_PL[month]} ${year}`
              : `${weekDays[0].toLocaleDateString("pl-PL")} — ${weekDays[6].toLocaleDateString("pl-PL")}`}
          </h2>
          <button onClick={view === "month" ? nextMonth : nextWeek} className="rounded-lg border border-primary/15 p-2 hover:bg-primary/5">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-primary/15 overflow-hidden">
            <button
              onClick={() => setView("month")}
              className={`px-3 py-1.5 text-xs font-medium ${view === "month" ? "bg-accent text-white" : "text-primary/60 hover:bg-primary/5"}`}
            >
              Miesiąc
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1.5 text-xs font-medium ${view === "week" ? "bg-accent text-white" : "text-primary/60 hover:bg-primary/5"}`}
            >
              Tydzień
            </button>
          </div>
          <button
            onClick={() => { setShowForm(true); setForm((prev) => ({ ...prev, eventDate: today.toISOString().slice(0, 10) })); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
          >
            <Plus className="h-4 w-4" /> Nowe wydarzenie
          </button>
        </div>
      </div>

      {/* Month View */}
      {view === "month" && (
        <div className="rounded-xl border border-primary/10 bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-7">
            {DAYS_PL.map((d) => (
              <div key={d} className="border-b border-primary/10 bg-gray-50 px-2 py-2 text-center text-xs font-semibold text-primary/60">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="min-h-[80px] border-b border-r border-primary/5 bg-gray-50/50" />;
              const dayEvents = getEventsForDay(day);
              const dayExpiries = getExpiriesForDay(day);
              const isToday = sameDay(day, today);
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[80px] cursor-pointer border-b border-r border-primary/5 p-1 transition-colors hover:bg-accent/5 ${isToday ? "bg-accent/5" : ""}`}
                  onClick={() => openFormForDate(day)}
                >
                  <div className={`mb-0.5 text-right text-xs font-medium ${isToday ? "text-accent font-bold" : "text-primary/50"}`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        className={`truncate rounded px-1 py-0.5 text-[10px] font-medium text-white ${TYPE_COLORS[ev.type] ?? "bg-gray-500"}`}
                        title={ev.title}
                        onClick={(e) => { e.stopPropagation(); setSelectedDate(day); }}
                      >
                        {ev.eventTime && <span>{ev.eventTime} </span>}
                        {ev.title}
                      </div>
                    ))}
                    {dayExpiries.slice(0, 2).map((exp, i) => (
                      <div
                        key={`exp-${i}`}
                        className="truncate rounded bg-red-100 px-1 py-0.5 text-[10px] font-medium text-red-700"
                        title={`${exp.foreignerName} — ${exp.typLabel}`}
                      >
                        {exp.foreignerName} — {exp.typLabel}
                      </div>
                    ))}
                    {(dayEvents.length + dayExpiries.length) > 5 && (
                      <div className="text-[9px] text-primary/40">+{dayEvents.length + dayExpiries.length - 5} więcej</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {view === "week" && (
        <div className="space-y-3">
          {weekDays.map((day) => {
            const dayEvents = getEventsForDay(day);
            const dayExpiries = getExpiriesForDay(day);
            const isToday = sameDay(day, today);
            return (
              <div key={day.toISOString()} className={`rounded-xl border bg-white p-4 shadow-sm ${isToday ? "border-accent/30" : "border-primary/10"}`}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className={`text-sm font-bold ${isToday ? "text-accent" : "text-primary"}`}>
                    {DAYS_PL[(day.getDay() + 6) % 7]} {day.toLocaleDateString("pl-PL")}
                  </h3>
                  <button
                    onClick={() => openFormForDate(day)}
                    className="rounded p-1 text-primary/30 hover:bg-primary/5 hover:text-primary"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {dayEvents.length === 0 && dayExpiries.length === 0 && (
                  <p className="text-xs text-primary/30">Brak wydarzeń</p>
                )}
                <div className="space-y-2">
                  {dayEvents.map((ev) => (
                    <div key={ev.id} className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                      <div className={`mt-0.5 h-3 w-3 rounded-full flex-shrink-0 ${TYPE_COLORS[ev.type] ?? "bg-gray-500"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-primary">{ev.title}</span>
                          <span className="text-[10px] text-primary/40">{TYPE_LABELS[ev.type]}</span>
                          {ev.eventTime && <span className="text-xs text-primary/50">{ev.eventTime}</span>}
                          {ev.emailSent && <span title="Email wysłany"><Mail className="h-3 w-3 text-green-500" /></span>}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-primary/50">
                          {ev.place && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.place}</span>}
                          {ev.organ && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{ev.organ}</span>}
                          {ev.foreignerName && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{ev.foreignerName}</span>}
                        </div>
                        {ev.description && <p className="mt-1 text-xs text-primary/40">{ev.description}</p>}
                      </div>
                      <button onClick={() => handleDelete(ev.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {dayExpiries.map((exp, i) => (
                    <div key={`exp-${i}`} className="flex items-center gap-3 rounded-lg bg-red-50 p-3 text-xs">
                      <div className="h-3 w-3 rounded-full bg-red-500 flex-shrink-0" />
                      <span className="text-red-700 font-medium">{exp.foreignerName}</span>
                      <span className="text-red-600">wygasa: {exp.typLabel}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Event Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleCreateEvent} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-primary">Nowe wydarzenie</h3>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-primary/40 hover:bg-primary/5">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-primary/60">Typ</label>
                <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className={inputCls}>
                  <option value="OFFICE_VISIT">Wizyta w urzędzie</option>
                  <option value="OFFICE_MEETING">Spotkanie w biurze</option>
                  <option value="OTHER">Inne</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-primary/60">Tytuł *</label>
                <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className={inputCls} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-primary/60">Data *</label>
                  <input type="date" value={form.eventDate} onChange={(e) => setForm((p) => ({ ...p, eventDate: e.target.value }))} className={inputCls} required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-primary/60">Godzina</label>
                  <input type="time" value={form.eventTime} onChange={(e) => setForm((p) => ({ ...p, eventTime: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-primary/60">Miejsce</label>
                <input value={form.place} onChange={(e) => setForm((p) => ({ ...p, place: e.target.value }))} className={inputCls} />
              </div>
              {form.type === "OFFICE_VISIT" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-primary/60">Organ (urząd)</label>
                  <input value={form.organ} onChange={(e) => setForm((p) => ({ ...p, organ: e.target.value }))} className={inputCls} placeholder="np. Urząd Wojewódzki, UdSC" />
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-primary/60">Powiązany cudzoziemiec</label>
                <select value={form.foreignerId} onChange={(e) => setForm((p) => ({ ...p, foreignerId: parseInt(e.target.value) || 0 }))} className={inputCls}>
                  <option value={0}>— brak —</option>
                  {foreigners.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-primary/60">Opis</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className={inputCls} rows={2} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-primary/60">
                  Dodatkowe informacje {form.type === "OFFICE_VISIT" && "(zostaną wysłane do cudzoziemca)"}
                </label>
                <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className={inputCls} rows={2} />
              </div>
              {form.type === "OFFICE_VISIT" && form.foreignerId > 0 && (
                <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                  Po utworzeniu wydarzenia do cudzoziemca zostanie automatycznie wysłany email z informacją o wizycie.
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-primary/15 px-4 py-2 text-sm font-medium text-primary/60 hover:bg-primary/5">
                Anuluj
              </button>
              <button type="submit" disabled={isPending} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isPending ? "Tworzenie..." : "Utwórz"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
