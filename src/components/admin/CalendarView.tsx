"use client";

import { useState, useTransition, useRef } from "react";
import { createCalendarEventAction, updateCalendarEventAction, deleteCalendarEventAction } from "@/lib/fdk-actions";
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
  Pencil,
  Clock,
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

const TYPE_BORDER_COLORS: Record<string, string> = {
  OFFICE_VISIT: "border-l-blue-500",
  OFFICE_MEETING: "border-l-green-500",
  OTHER: "border-l-gray-500",
};

const TYPE_BG_LIGHT: Record<string, string> = {
  OFFICE_VISIT: "bg-blue-50 hover:bg-blue-100",
  OFFICE_MEETING: "bg-green-50 hover:bg-green-100",
  OTHER: "bg-gray-50 hover:bg-gray-100",
};

const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

const DAYS_PL = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];
const DAYS_FULL_PL = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];

const WEEK_HOURS_START = 7;
const WEEK_HOURS_END = 20;
const HOUR_HEIGHT_PX = 60;

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function parseTime(timeStr: string | null): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(":");
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h + m / 60;
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

export function CalendarView({ events, documentExpiries, foreigners }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();
  const [hoveredEvent, setHoveredEvent] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const emptyForm = {
    type: "OFFICE_VISIT" as string,
    title: "",
    description: "",
    eventDate: "",
    eventTime: "",
    place: "",
    organ: "",
    foreignerId: 0,
    notes: "",
  };

  // Form state
  const [form, setForm] = useState(emptyForm);

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

  const handleSubmitEvent = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = editingEventId
        ? await updateCalendarEventAction(editingEventId, form as never)
        : await createCalendarEventAction(form as never);
      if (result.ok) {
        closeForm();
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

  const openFormForDate = (day: Date, time?: string) => {
    setEditingEventId(null);
    setForm({ ...emptyForm, eventDate: day.toISOString().slice(0, 10), eventTime: time ?? "" });
    setSelectedDate(day);
    setShowForm(true);
  };

  const openEditForm = (ev: CalendarEventData) => {
    setEditingEventId(ev.id);
    setForm({
      type: ev.type,
      title: ev.title,
      description: ev.description ?? "",
      eventDate: new Date(ev.eventDate).toISOString().slice(0, 10),
      eventTime: ev.eventTime ?? "",
      place: ev.place ?? "",
      organ: ev.organ ?? "",
      foreignerId: ev.foreignerId ?? 0,
      notes: ev.notes ?? "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingEventId(null);
    setForm(emptyForm);
  };

  const today = new Date();
  const inputCls =
    "block w-full rounded-md border border-primary/15 bg-white px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20";

  // Week grid click handler: determine hour from click position
  const handleWeekGridClick = (day: Date, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hour = Math.floor(y / HOUR_HEIGHT_PX) + WEEK_HOURS_START;
    const clampedHour = Math.max(WEEK_HOURS_START, Math.min(WEEK_HOURS_END - 1, hour));
    openFormForDate(day, `${clampedHour.toString().padStart(2, "0")}:00`);
  };

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
          <button
            onClick={() => setCurrentDate(new Date())}
            className="rounded-lg border border-primary/15 px-3 py-1.5 text-xs font-medium text-primary/60 hover:bg-primary/5"
          >
            Dziś
          </button>
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
            onClick={() => { setEditingEventId(null); setForm({ ...emptyForm, eventDate: today.toISOString().slice(0, 10) }); setShowForm(true); }}
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
              if (!day) return <div key={`empty-${idx}`} className="min-h-[100px] border-b border-r border-primary/5 bg-gray-50/50" />;
              const dayEvents = getEventsForDay(day);
              const dayExpiries = getExpiriesForDay(day);
              const isToday = sameDay(day, today);
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[100px] border-b border-r border-primary/5 p-1 transition-colors hover:bg-accent/5 ${isToday ? "bg-accent/5" : ""}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className={`text-xs font-medium ${isToday ? "flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white" : "text-primary/50 pl-1"}`}>
                      {day.getDate()}
                    </div>
                    <button
                      onClick={() => openFormForDate(day)}
                      className="rounded p-0.5 text-primary/20 hover:text-accent hover:bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ opacity: undefined }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "")}
                      title="Dodaj wydarzenie"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        className={`w-full truncate rounded px-1.5 py-1 text-[11px] font-medium text-white cursor-pointer text-left transition-opacity ${hoveredEvent === ev.id ? "opacity-80" : ""} ${TYPE_COLORS[ev.type] ?? "bg-gray-500"}`}
                        title={`${ev.title}${ev.eventTime ? ` (${ev.eventTime})` : ""} — kliknij aby edytować`}
                        onClick={() => openEditForm(ev)}
                        onMouseEnter={() => setHoveredEvent(ev.id)}
                        onMouseLeave={() => setHoveredEvent(null)}
                      >
                        {ev.eventTime && <span className="opacity-80">{ev.eventTime} </span>}
                        {ev.title}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-primary/40 pl-1">+{dayEvents.length - 3} więcej</div>
                    )}
                    {dayExpiries.slice(0, 2).map((exp, i) => (
                      <div
                        key={`exp-${i}`}
                        className="truncate rounded bg-red-100 px-1.5 py-1 text-[11px] font-medium text-red-700"
                        title={`${exp.foreignerName} — ${exp.typLabel}`}
                      >
                        {exp.foreignerName} — {exp.typLabel}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View — Time Grid (Outlook-style) */}
      {view === "week" && (
        <div className="rounded-xl border border-primary/10 bg-white shadow-sm overflow-hidden">
          {/* All-day events & document expiries banner */}
          {(() => {
            const allDayItems = weekDays.map((day, dayIdx) => {
              const noTimeEvents = getEventsForDay(day).filter((ev) => !ev.eventTime);
              const expiries = getExpiriesForDay(day);
              return { dayIdx, day, noTimeEvents, expiries };
            });
            const hasAnyAllDay = allDayItems.some((d) => d.noTimeEvents.length > 0 || d.expiries.length > 0);
            if (!hasAnyAllDay) return null;
            return (
              <div className="border-b border-primary/10">
                <div className="grid grid-cols-[60px_repeat(7,1fr)]">
                  <div className="border-r border-primary/10 bg-gray-50 px-1 py-2 text-[10px] text-primary/40 text-center">
                    Cały<br />dzień
                  </div>
                  {allDayItems.map(({ dayIdx, day, noTimeEvents, expiries }) => (
                    <div key={dayIdx} className={`border-r border-primary/5 px-1 py-1 min-h-[32px] ${sameDay(day, today) ? "bg-accent/5" : ""}`}>
                      {noTimeEvents.map((ev) => (
                        <button
                          key={ev.id}
                          type="button"
                          className={`w-full truncate rounded px-1.5 py-0.5 mb-0.5 text-[10px] font-medium text-white text-left ${TYPE_COLORS[ev.type] ?? "bg-gray-500"} hover:opacity-80`}
                          onClick={() => openEditForm(ev)}
                          title={`${ev.title} — kliknij aby edytować`}
                        >
                          {ev.title}
                        </button>
                      ))}
                      {expiries.map((exp, i) => (
                        <div key={`exp-${i}`} className="truncate rounded bg-red-100 px-1.5 py-0.5 mb-0.5 text-[10px] font-medium text-red-700">
                          {exp.foreignerName}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Day headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-primary/10">
            <div className="border-r border-primary/10 bg-gray-50" />
            {weekDays.map((day, i) => {
              const isToday = sameDay(day, today);
              return (
                <div key={i} className={`border-r border-primary/5 px-2 py-2 text-center ${isToday ? "bg-accent/5" : "bg-gray-50"}`}>
                  <div className="text-[10px] font-medium text-primary/40 uppercase">{DAYS_PL[i]}</div>
                  <div className={`text-lg font-bold ${isToday ? "text-accent" : "text-primary"}`}>
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }} ref={gridRef}>
            <div className="grid grid-cols-[60px_repeat(7,1fr)]" style={{ minHeight: `${(WEEK_HOURS_END - WEEK_HOURS_START) * HOUR_HEIGHT_PX}px` }}>
              {/* Hour labels */}
              <div className="border-r border-primary/10 relative">
                {Array.from({ length: WEEK_HOURS_END - WEEK_HOURS_START }, (_, i) => (
                  <div
                    key={i}
                    className="absolute right-2 text-[11px] text-primary/40 font-medium"
                    style={{ top: `${i * HOUR_HEIGHT_PX - 7}px` }}
                  >
                    {formatHour(WEEK_HOURS_START + i)}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day, dayIdx) => {
                const dayEvents = getEventsForDay(day).filter((ev) => ev.eventTime);
                const isToday = sameDay(day, today);
                return (
                  <div
                    key={dayIdx}
                    className={`border-r border-primary/5 relative cursor-pointer ${isToday ? "bg-accent/[0.02]" : ""}`}
                    onClick={(e) => handleWeekGridClick(day, e)}
                  >
                    {/* Hour grid lines */}
                    {Array.from({ length: WEEK_HOURS_END - WEEK_HOURS_START }, (_, i) => (
                      <div
                        key={i}
                        className="absolute inset-x-0 border-t border-primary/5"
                        style={{ top: `${i * HOUR_HEIGHT_PX}px` }}
                      />
                    ))}
                    {/* Half-hour grid lines */}
                    {Array.from({ length: WEEK_HOURS_END - WEEK_HOURS_START }, (_, i) => (
                      <div
                        key={`half-${i}`}
                        className="absolute inset-x-0 border-t border-primary/[0.03] border-dashed"
                        style={{ top: `${i * HOUR_HEIGHT_PX + HOUR_HEIGHT_PX / 2}px` }}
                      />
                    ))}

                    {/* Current time indicator */}
                    {isToday && (() => {
                      const now = new Date();
                      const currentHour = now.getHours() + now.getMinutes() / 60;
                      if (currentHour < WEEK_HOURS_START || currentHour > WEEK_HOURS_END) return null;
                      const top = (currentHour - WEEK_HOURS_START) * HOUR_HEIGHT_PX;
                      return (
                        <div className="absolute inset-x-0 z-10 pointer-events-none" style={{ top: `${top}px` }}>
                          <div className="h-0.5 bg-red-500 relative">
                            <div className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-red-500" />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Events positioned on the grid */}
                    {dayEvents.map((ev) => {
                      const time = parseTime(ev.eventTime);
                      if (time === null) return null;
                      const top = Math.max(0, (time - WEEK_HOURS_START) * HOUR_HEIGHT_PX);
                      const eventDuration = 1; // default 1 hour
                      const height = eventDuration * HOUR_HEIGHT_PX - 2;
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          className={`absolute left-0.5 right-0.5 z-20 rounded border-l-[3px] px-1.5 py-1 text-left overflow-hidden cursor-pointer transition-shadow hover:shadow-md ${TYPE_BORDER_COLORS[ev.type] ?? "border-l-gray-500"} ${TYPE_BG_LIGHT[ev.type] ?? "bg-gray-50 hover:bg-gray-100"}`}
                          style={{ top: `${top}px`, minHeight: `${height}px` }}
                          onClick={(e) => { e.stopPropagation(); openEditForm(ev); }}
                          title={`${ev.title} — kliknij aby edytować`}
                        >
                          <div className="text-[11px] font-semibold text-primary truncate">{ev.title}</div>
                          <div className="text-[10px] text-primary/50 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5 inline" />
                            {ev.eventTime}
                            {ev.place && <span className="truncate">· {ev.place}</span>}
                          </div>
                          {ev.foreignerName && (
                            <div className="text-[10px] text-primary/40 truncate">{ev.foreignerName}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Event Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleSubmitEvent} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-primary">
                {editingEventId ? "Edytuj wydarzenie" : "Nowe wydarzenie"}
              </h3>
              <button type="button" onClick={closeForm} className="rounded-lg p-1.5 text-primary/40 hover:bg-primary/5">
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

            <div className="mt-5 flex items-center justify-between">
              {editingEventId ? (
                <button
                  type="button"
                  onClick={() => { closeForm(); handleDelete(editingEventId); }}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Usuń
                </button>
              ) : <div />}
              <div className="flex gap-3">
                <button type="button" onClick={closeForm} className="rounded-lg border border-primary/15 px-4 py-2 text-sm font-medium text-primary/60 hover:bg-primary/5">
                  Anuluj
                </button>
                <button type="submit" disabled={isPending} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingEventId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {isPending ? "Zapisywanie..." : editingEventId ? "Zapisz" : "Utwórz"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
