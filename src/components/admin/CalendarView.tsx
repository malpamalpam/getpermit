"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createCalendarEventAction, updateCalendarEventAction, deleteCalendarEventAction, toggleCalendarEventDoneAction } from "@/lib/fdk-actions";
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
  AlertCircle,
  Eye,
  Check,
  Filter,
  Search,
} from "lucide-react";

interface CalendarEventData {
  id: number;
  type: string;
  title: string;
  description: string | null;
  eventDate: string;
  eventTime: string | null;
  place: string | null;
  organ: string | null;
  foreignerId: number | null;
  foreignerName: string | null;
  notes: string | null;
  assignedTo: string | null;
  emailSent: boolean;
  done: boolean;
  doneAt: string | null;
  createdAt: string;
}

interface DocumentExpiry {
  foreignerName: string;
  typLabel: string;
  typ: string;
  dataDo: string;
  daysLeft: number;
}

function expiryTooltip(exp: DocumentExpiry): string {
  const dateStr = new Date(exp.dataDo).toLocaleDateString("pl-PL");
  if (exp.daysLeft < 0) {
    return `Koniec ${exp.typLabel.toLowerCase()}: ${exp.foreignerName} — wygasło ${Math.abs(exp.daysLeft)} dni temu (${dateStr})`;
  }
  if (exp.daysLeft === 0) {
    return `Koniec ${exp.typLabel.toLowerCase()}: ${exp.foreignerName} — wygasa DZIŚ (${dateStr})`;
  }
  return `Koniec ${exp.typLabel.toLowerCase()}: ${exp.foreignerName} — za ${exp.daysLeft} dni (${dateStr})`;
}

interface Props {
  events: CalendarEventData[];
  documentExpiries: DocumentExpiry[];
  foreigners: { id: number; name: string }[];
  staffList: { id: string; name: string }[];
}

const TYPE_LABELS: Record<string, string> = {
  OFFICE_VISIT: "Wizyta w urzędzie",
  OFFICE_MEETING: "Spotkanie w biurze",
  DOCUMENT_EXPIRY: "Koniec dokumentu",
  WORK_START_REMINDER: "Podjęcie pracy",
  CONTRACT_REMINDER: "Zgłoszenie umowy",
  WORK_NOTIFICATION: "Notyfikacja pracy",
  OTHER: "Inne",
};

const TYPE_COLORS: Record<string, string> = {
  OFFICE_VISIT: "bg-blue-500",
  OFFICE_MEETING: "bg-green-500",
  DOCUMENT_EXPIRY: "bg-red-500",
  WORK_START_REMINDER: "bg-orange-500",
  CONTRACT_REMINDER: "bg-purple-500",
  WORK_NOTIFICATION: "bg-teal-500",
  OTHER: "bg-gray-500",
};

const TYPE_BORDER_COLORS: Record<string, string> = {
  OFFICE_VISIT: "border-l-blue-500",
  OFFICE_MEETING: "border-l-green-500",
  DOCUMENT_EXPIRY: "border-l-red-500",
  WORK_START_REMINDER: "border-l-orange-500",
  CONTRACT_REMINDER: "border-l-purple-500",
  WORK_NOTIFICATION: "border-l-teal-500",
  OTHER: "border-l-gray-500",
};

const TYPE_BG_LIGHT: Record<string, string> = {
  OFFICE_VISIT: "bg-blue-50 hover:bg-blue-100",
  OFFICE_MEETING: "bg-green-50 hover:bg-green-100",
  DOCUMENT_EXPIRY: "bg-red-50 hover:bg-red-100",
  WORK_START_REMINDER: "bg-orange-50 hover:bg-orange-100",
  CONTRACT_REMINDER: "bg-purple-50 hover:bg-purple-100",
  WORK_NOTIFICATION: "bg-teal-50 hover:bg-teal-100",
  OTHER: "bg-gray-50 hover:bg-gray-100",
};

const ALL_EVENT_TYPES = Object.keys(TYPE_LABELS);

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

function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function CalendarView({ events, documentExpiries, foreigners, staffList }: Props) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();
  const [hoveredEvent, setHoveredEvent] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const dayGridRef = useRef<HTMLDivElement>(null);
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set(ALL_EVENT_TYPES));
  const [showLegend, setShowLegend] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CalendarEventData[]>([]);
  const [showSearch, setShowSearch] = useState(false);

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
    assignedTo: "",
  };

  // Form state
  const [form, setForm] = useState(emptyForm);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevWeek = () => setCurrentDate(new Date(currentDate.getTime() - 7 * 86400000));
  const nextWeek = () => setCurrentDate(new Date(currentDate.getTime() + 7 * 86400000));
  const prevDay = () => setCurrentDate(new Date(currentDate.getTime() - 86400000));
  const nextDay = () => setCurrentDate(new Date(currentDate.getTime() + 86400000));

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

  const toggleTypeFilter = (type: string) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleToggleDone = (id: number) => {
    startTransition(async () => {
      await toggleCalendarEventDoneAction(id);
      router.refresh();
    });
  };

  function getEventsForDay(day: Date) {
    return events.filter((e) => sameDay(new Date(e.eventDate), day) && visibleTypes.has(e.type));
  }

  function getExpiriesForDay(day: Date) {
    return documentExpiries.filter((e) => sameDay(new Date(e.dataDo), day));
  }

  const handleSubmitEvent = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      try {
        const result = editingEventId
          ? await updateCalendarEventAction(editingEventId, form as never)
          : await createCalendarEventAction(form as never);
        if (result.ok) {
          closeForm();
          router.refresh();
        } else {
          setFormError("Nie udało się zapisać wydarzenia. Sprawdź, czy wszystkie wymagane pola są wypełnione.");
        }
      } catch {
        setFormError("Wystąpił błąd połączenia. Spróbuj ponownie.");
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Usunąć to wydarzenie?")) return;
    startTransition(async () => {
      try {
        await deleteCalendarEventAction(id);
        router.refresh();
      } catch {
        setFormError("Nie udało się usunąć wydarzenia.");
      }
    });
  };

  const openFormForDate = (day: Date, time?: string) => {
    setEditingEventId(null);
    setFormError(null);
    setForm({ ...emptyForm, eventDate: toLocalDateString(day), eventTime: time ?? "" });
    setSelectedDate(day);
    setShowForm(true);
  };

  const openEventDetail = (ev: CalendarEventData) => {
    setSelectedEvent(ev);
  };

  const startEditById = (eventId: number) => {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    const d = new Date(ev.eventDate);
    const dateStr = toLocalDateString(d);
    setSelectedEvent(null);
    setEditingEventId(ev.id);
    setFormError(null);
    setForm({
      type: ev.type,
      title: ev.title,
      description: ev.description ?? "",
      eventDate: dateStr,
      eventTime: ev.eventTime ?? "",
      place: ev.place ?? "",
      organ: ev.organ ?? "",
      foreignerId: ev.foreignerId ?? 0,
      notes: ev.notes ?? "",
      assignedTo: ev.assignedTo ?? "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingEventId(null);
    setFormError(null);
    setForm(emptyForm);
  };

  const today = new Date();

  // Auto-scroll to current time in week/day view
  useEffect(() => {
    const ref = view === "week" ? gridRef.current : view === "day" ? dayGridRef.current : null;
    if (ref) {
      const now = new Date();
      const currentHour = now.getHours() + now.getMinutes() / 60;
      const scrollTarget = Math.max(0, (Math.min(currentHour, WEEK_HOURS_END) - WEEK_HOURS_START - 1) * HOUR_HEIGHT_PX);
      ref.scrollTop = scrollTarget;
    }
  }, [view, currentDate]);

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

  // Search logic
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const q = query.toLowerCase();
    const results = events.filter((ev) =>
      ev.title.toLowerCase().includes(q) ||
      (ev.foreignerName && ev.foreignerName.toLowerCase().includes(q)) ||
      (ev.description && ev.description.toLowerCase().includes(q)) ||
      (TYPE_LABELS[ev.type] ?? "").toLowerCase().includes(q)
    );
    setSearchResults(results.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()));
  };

  const jumpToEvent = (ev: CalendarEventData) => {
    setCurrentDate(new Date(ev.eventDate));
    setView("day");
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Year change
  const handleYearChange = (newYear: number) => {
    setCurrentDate(new Date(newYear, month, 1));
  };

  // Header navigation
  const handlePrev = () => {
    if (view === "month") prevMonth();
    else if (view === "week") prevWeek();
    else prevDay();
  };
  const handleNext = () => {
    if (view === "month") nextMonth();
    else if (view === "week") nextWeek();
    else nextDay();
  };

  const headerTitle = (() => {
    if (view === "month") return `${MONTHS_PL[month]} ${year}`;
    if (view === "week") return `${weekDays[0].toLocaleDateString("pl-PL")} — ${weekDays[6].toLocaleDateString("pl-PL")}`;
    // day view
    const dow = (currentDate.getDay() + 6) % 7;
    return `${DAYS_FULL_PL[dow]}, ${currentDate.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}`;
  })();

  // Day view data
  const dayViewEvents = getEventsForDay(currentDate);
  const dayViewExpiries = getExpiriesForDay(currentDate);
  const dayTimedEvents = dayViewEvents.filter((ev) => ev.eventTime);
  const dayAllDayEvents = dayViewEvents.filter((ev) => !ev.eventTime);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={handlePrev} className="rounded-lg border border-primary/15 p-2 hover:bg-primary/5">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-bold text-primary">
              {headerTitle}
            </h2>
            <select
              value={year}
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
              className="rounded-md border border-primary/15 bg-white px-2 py-1 text-sm font-medium text-primary focus:border-accent focus:outline-none"
            >
              {Array.from({ length: 10 }, (_, i) => year - 3 + i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button onClick={handleNext} className="rounded-lg border border-primary/15 p-2 hover:bg-primary/5">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setCurrentDate(new Date()); setView("day"); }}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${view === "day" && sameDay(currentDate, today) ? "border-accent bg-accent text-white" : "border-primary/15 text-primary/60 hover:bg-primary/5"}`}
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
            <button
              onClick={() => setView("day")}
              className={`px-3 py-1.5 text-xs font-medium ${view === "day" ? "bg-accent text-white" : "text-primary/60 hover:bg-primary/5"}`}
            >
              Dzień
            </button>
          </div>
          <button
            onClick={() => { setEditingEventId(null); setForm({ ...emptyForm, eventDate: toLocalDateString(today) }); setShowForm(true); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
          >
            <Plus className="h-4 w-4" /> Nowe wydarzenie
          </button>
          <button
            type="button"
            onClick={() => { setShowSearch((p) => !p); if (showSearch) { setSearchQuery(""); setSearchResults([]); } }}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${showSearch ? "border-accent bg-accent/10 text-accent" : "border-primary/15 text-primary/60 hover:bg-primary/5"}`}
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowLegend((p) => !p)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${showLegend ? "border-accent bg-accent/10 text-accent" : "border-primary/15 text-primary/60 hover:bg-primary/5"}`}
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="mb-4 rounded-lg border border-primary/10 bg-white p-3 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Szukaj wydarzeń po nazwie, osobie, typie..."
              className="w-full rounded-lg border border-primary/15 bg-white py-2 pl-10 pr-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              autoFocus
            />
          </div>
          {searchQuery && (
            <div className="mt-2 max-h-[300px] overflow-y-auto">
              {searchResults.length === 0 ? (
                <p className="py-3 text-center text-sm text-primary/40">Brak wyników</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-primary/40 mb-1">{searchResults.length} wyników</p>
                  {searchResults.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => jumpToEvent(ev)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent/5 transition-colors"
                    >
                      <span className={`inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full ${TYPE_COLORS[ev.type] ?? "bg-gray-500"}`} />
                      <div className="min-w-0 flex-1">
                        <div className={`font-medium text-primary truncate ${ev.done ? "line-through opacity-50" : ""}`}>{ev.title}</div>
                        <div className="text-xs text-primary/50">
                          {new Date(ev.eventDate).toLocaleDateString("pl-PL")}
                          {ev.eventTime && ` ${ev.eventTime}`}
                          {ev.foreignerName && ` · ${ev.foreignerName}`}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Legend & Filters */}
      {showLegend && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary/10 bg-white p-3 shadow-sm">
          <span className="text-xs font-semibold text-primary/50 mr-1">Filtruj:</span>
          {ALL_EVENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleTypeFilter(type)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-opacity ${
                visibleTypes.has(type) ? "" : "opacity-30"
              }`}
            >
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${TYPE_COLORS[type] ?? "bg-gray-500"}`} />
              {TYPE_LABELS[type] ?? type}
            </button>
          ))}
          <span className="mx-2 h-4 border-l border-primary/15" />
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
            Koniec dokumentu (expiry)
          </span>
        </div>
      )}

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
                  className={`min-h-[100px] border-b border-r border-primary/5 p-1 transition-colors hover:bg-accent/5 cursor-pointer ${isToday ? "bg-accent/5" : ""}`}
                  onClick={() => { setCurrentDate(day); setView("day"); }}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`text-xs font-medium ${isToday ? "flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white" : "text-primary/50 pl-1"}`}
                    >
                      {day.getDate()}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); openFormForDate(day); }}
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
                        className={`w-full truncate rounded px-1.5 py-1 text-[11px] font-medium text-white cursor-pointer text-left transition-opacity ${hoveredEvent === ev.id ? "opacity-80" : ""} ${ev.done ? "opacity-50 line-through" : ""} ${TYPE_COLORS[ev.type] ?? "bg-gray-500"}`}
                        title={`${ev.title}${ev.eventTime ? ` (${ev.eventTime})` : ""}${ev.done ? " ✓ DONE" : ""} — kliknij aby edytować`}
                        onClick={(e) => { e.stopPropagation(); startEditById(ev.id); }}
                        onMouseEnter={() => setHoveredEvent(ev.id)}
                        onMouseLeave={() => setHoveredEvent(null)}
                      >
                        {ev.done && <Check className="inline h-2.5 w-2.5 mr-0.5" />}
                        {ev.eventTime && <span className="opacity-80">{ev.eventTime} </span>}
                        {ev.title}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <span
                        className="text-[10px] text-primary/40 pl-1 hover:text-accent cursor-pointer"
                      >
                        +{dayEvents.length - 3} więcej
                      </span>
                    )}
                    {dayExpiries.slice(0, 2).map((exp, i) => (
                      <div
                        key={`exp-${i}`}
                        className="truncate rounded bg-red-100 px-1.5 py-1 text-[11px] font-medium text-red-700"
                        title={expiryTooltip(exp)}
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
                          className={`w-full truncate rounded px-1.5 py-0.5 mb-0.5 text-[10px] font-medium text-white text-left ${TYPE_COLORS[ev.type] ?? "bg-gray-500"} hover:opacity-80 ${ev.done ? "opacity-50 line-through" : ""}`}
                          onClick={() => startEditById(ev.id)}
                          title={`${ev.title}${ev.done ? " ✓ DONE" : ""} — kliknij aby edytować`}
                        >
                          {ev.done && <Check className="inline h-2.5 w-2.5 mr-0.5" />}{ev.title}
                        </button>
                      ))}
                      {expiries.map((exp, i) => (
                        <div key={`exp-${i}`} className="truncate rounded bg-red-100 px-1.5 py-0.5 mb-0.5 text-[10px] font-medium text-red-700" title={expiryTooltip(exp)}>
                          {exp.foreignerName} — {exp.typLabel}
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
                  <button
                    type="button"
                    onClick={() => { setCurrentDate(day); setView("day"); }}
                    className={`text-lg font-bold cursor-pointer hover:underline ${isToday ? "text-accent" : "text-primary"}`}
                  >
                    {day.getDate()}
                  </button>
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
                          className={`absolute left-0.5 right-0.5 z-20 rounded border-l-[3px] px-1.5 py-1 text-left overflow-hidden cursor-pointer transition-shadow hover:shadow-md ${TYPE_BORDER_COLORS[ev.type] ?? "border-l-gray-500"} ${TYPE_BG_LIGHT[ev.type] ?? "bg-gray-50 hover:bg-gray-100"} ${ev.done ? "opacity-50" : ""}`}
                          style={{ top: `${top}px`, minHeight: `${height}px` }}
                          onClick={(e) => { e.stopPropagation(); startEditById(ev.id); }}
                          title={`${ev.title}${ev.done ? " ✓ DONE" : ""} — kliknij aby edytować`}
                        >
                          <div className={`text-[11px] font-semibold text-primary truncate ${ev.done ? "line-through" : ""}`}>{ev.done && <Check className="inline h-2.5 w-2.5 mr-0.5" />}{ev.title}</div>
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

      {/* Day View */}
      {view === "day" && (
        <div className="rounded-xl border border-primary/10 bg-white shadow-sm overflow-hidden">
          {/* All-day events & expiries */}
          {(dayAllDayEvents.length > 0 || dayViewExpiries.length > 0) && (
            <div className="border-b border-primary/10 p-3 space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-primary/40 mb-1">Cały dzień</div>
              {dayAllDayEvents.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => startEditById(ev.id)}
                  className={`w-full text-left rounded-lg border-l-4 p-3 transition-colors ${TYPE_BORDER_COLORS[ev.type] ?? "border-l-gray-500"} ${TYPE_BG_LIGHT[ev.type] ?? "bg-gray-50 hover:bg-gray-100"} ${ev.done ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold text-primary ${ev.done ? "line-through" : ""}`}>{ev.done && <Check className="inline h-3 w-3 mr-0.5" />}{ev.title}</span>
                      <span className="text-[10px] text-primary/40">{TYPE_LABELS[ev.type] ?? ev.type}</span>
                    </div>
                    <Pencil className="h-3.5 w-3.5 text-primary/30" />
                  </div>
                  {ev.foreignerName && <div className="text-xs text-primary/50 mt-0.5">{ev.foreignerName}</div>}
                </button>
              ))}
              {dayViewExpiries.map((exp, i) => (
                <div key={`exp-${i}`} className="rounded-lg border-l-4 border-l-red-500 bg-red-50 p-3 text-xs font-medium text-red-700" title={expiryTooltip(exp)}>
                  <div>{exp.foreignerName} — {exp.typLabel}</div>
                  <div className="mt-0.5 text-red-600/70 font-normal">
                    {exp.daysLeft < 0
                      ? `Wygasło ${Math.abs(exp.daysLeft)} dni temu`
                      : exp.daysLeft === 0
                        ? "Wygasa DZIŚ"
                        : `Pozostało ${exp.daysLeft} dni`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Time grid for single day */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }} ref={dayGridRef}>
            <div className="relative" style={{ minHeight: `${(WEEK_HOURS_END - WEEK_HOURS_START) * HOUR_HEIGHT_PX}px` }}>
              {/* Hour rows */}
              {Array.from({ length: WEEK_HOURS_END - WEEK_HOURS_START }, (_, i) => (
                <div
                  key={i}
                  className="absolute inset-x-0 border-t border-primary/5 flex"
                  style={{ top: `${i * HOUR_HEIGHT_PX}px`, height: `${HOUR_HEIGHT_PX}px` }}
                >
                  <div className="w-16 flex-shrink-0 pr-2 text-right text-[11px] text-primary/40 font-medium -mt-[7px]">
                    {formatHour(WEEK_HOURS_START + i)}
                  </div>
                  <div
                    className="flex-1 cursor-pointer hover:bg-accent/5 transition-colors"
                    onClick={() => openFormForDate(currentDate, `${(WEEK_HOURS_START + i).toString().padStart(2, "0")}:00`)}
                  />
                </div>
              ))}
              {/* Half-hour lines */}
              {Array.from({ length: WEEK_HOURS_END - WEEK_HOURS_START }, (_, i) => (
                <div
                  key={`half-${i}`}
                  className="absolute border-t border-primary/[0.03] border-dashed"
                  style={{ top: `${i * HOUR_HEIGHT_PX + HOUR_HEIGHT_PX / 2}px`, left: "64px", right: 0 }}
                />
              ))}

              {/* Current time indicator */}
              {sameDay(currentDate, today) && (() => {
                const now = new Date();
                const currentHour = now.getHours() + now.getMinutes() / 60;
                if (currentHour < WEEK_HOURS_START || currentHour > WEEK_HOURS_END) return null;
                const top = (currentHour - WEEK_HOURS_START) * HOUR_HEIGHT_PX;
                return (
                  <div className="absolute z-10 pointer-events-none" style={{ top: `${top}px`, left: "60px", right: 0 }}>
                    <div className="h-0.5 bg-red-500 relative">
                      <div className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-red-500" />
                    </div>
                  </div>
                );
              })()}

              {/* Events positioned on the grid */}
              {dayTimedEvents.map((ev) => {
                const time = parseTime(ev.eventTime);
                if (time === null) return null;
                const top = Math.max(0, (time - WEEK_HOURS_START) * HOUR_HEIGHT_PX);
                const eventDuration = 1;
                const height = eventDuration * HOUR_HEIGHT_PX - 2;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    className={`absolute z-20 rounded-lg border-l-4 px-3 py-2 text-left overflow-hidden cursor-pointer transition-shadow hover:shadow-md ${TYPE_BORDER_COLORS[ev.type] ?? "border-l-gray-500"} ${TYPE_BG_LIGHT[ev.type] ?? "bg-gray-50 hover:bg-gray-100"} ${ev.done ? "opacity-50" : ""}`}
                    style={{ top: `${top}px`, minHeight: `${height}px`, left: "68px", right: "8px" }}
                    onClick={(e) => { e.stopPropagation(); startEditById(ev.id); }}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`text-sm font-semibold text-primary truncate ${ev.done ? "line-through" : ""}`}>{ev.done && <Check className="inline h-3 w-3 mr-0.5" />}{ev.title}</div>
                      <Pencil className="h-3.5 w-3.5 text-primary/30 flex-shrink-0 ml-2" />
                    </div>
                    <div className="text-xs text-primary/50 flex items-center gap-1.5 mt-0.5">
                      <Clock className="h-3 w-3 inline" />
                      {ev.eventTime}
                      {ev.place && (
                        <>
                          <MapPin className="h-3 w-3 inline" />
                          <span className="truncate">{ev.place}</span>
                        </>
                      )}
                    </div>
                    {ev.foreignerName && (
                      <div className="text-xs text-primary/40 mt-0.5 flex items-center gap-1">
                        <User className="h-3 w-3 inline" />
                        {ev.foreignerName}
                      </div>
                    )}
                    {ev.assignedTo && (
                      <div className="text-xs text-accent/60 mt-0.5 flex items-center gap-1">
                        <User className="h-3 w-3 inline" />
                        Prowadzi: {ev.assignedTo}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Empty state for day view */}
          {dayViewEvents.length === 0 && dayViewExpiries.length === 0 && (
            <div className="p-12 text-center">
              <div className="text-primary/30 mb-3">
                <Clock className="h-10 w-10 mx-auto" />
              </div>
              <p className="text-sm text-primary/50 mb-4">Brak wydarzeń na ten dzień</p>
              <button
                type="button"
                onClick={() => openFormForDate(currentDate)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
              >
                <Plus className="h-4 w-4" /> Dodaj wydarzenie
              </button>
            </div>
          )}
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
                  {ALL_EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
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
                <label className="mb-1 block text-xs font-medium text-primary/60">Osoba prowadząca (z działu)</label>
                <select value={form.assignedTo} onChange={(e) => setForm((p) => ({ ...p, assignedTo: e.target.value }))} className={inputCls}>
                  <option value="">— brak —</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
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

            {formError && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {formError}
              </div>
            )}

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

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedEvent(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${TYPE_COLORS[selectedEvent.type] ?? "bg-gray-500"}`} />
                <span className="text-xs font-medium text-primary/50">
                  {TYPE_LABELS[selectedEvent.type] ?? selectedEvent.type}
                </span>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="rounded-lg p-1.5 text-primary/40 hover:bg-primary/5">
                <X className="h-5 w-5" />
              </button>
            </div>

            <h3 className="font-display text-xl font-bold text-primary mb-4">{selectedEvent.title}</h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-primary/70">
                <Clock className="h-4 w-4 flex-shrink-0 text-primary/40" />
                <span>
                  {new Date(selectedEvent.eventDate).toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  {selectedEvent.eventTime && `, godz. ${selectedEvent.eventTime}`}
                </span>
              </div>

              {selectedEvent.place && (
                <div className="flex items-center gap-2 text-primary/70">
                  <MapPin className="h-4 w-4 flex-shrink-0 text-primary/40" />
                  <span>{selectedEvent.place}</span>
                </div>
              )}

              {selectedEvent.organ && (
                <div className="flex items-center gap-2 text-primary/70">
                  <Building2 className="h-4 w-4 flex-shrink-0 text-primary/40" />
                  <span>{selectedEvent.organ}</span>
                </div>
              )}

              {selectedEvent.foreignerName && (
                <div className="flex items-center gap-2 text-primary/70">
                  <User className="h-4 w-4 flex-shrink-0 text-primary/40" />
                  <span>{selectedEvent.foreignerName}</span>
                </div>
              )}

              {selectedEvent.assignedTo && (
                <div className="flex items-center gap-2 text-primary/70">
                  <User className="h-4 w-4 flex-shrink-0 text-accent/60" />
                  <span>Prowadzi: <strong>{selectedEvent.assignedTo}</strong></span>
                </div>
              )}

              {selectedEvent.description && (
                <div className="mt-3 rounded-lg bg-gray-50 p-3 text-primary/70">
                  {selectedEvent.description}
                </div>
              )}

              {selectedEvent.notes && (
                <div className="rounded-lg bg-blue-50 p-3 text-blue-700">
                  <div className="text-xs font-semibold mb-1">Dodatkowe informacje:</div>
                  {selectedEvent.notes}
                </div>
              )}

              {selectedEvent.emailSent && (
                <div className="flex items-center gap-1.5 text-xs text-green-600">
                  <Mail className="h-3.5 w-3.5" />
                  Email wysłany do cudzoziemca
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => { setSelectedEvent(null); handleDelete(selectedEvent.id); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Usuń
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { handleToggleDone(selectedEvent.id); setSelectedEvent(null); }}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${
                    selectedEvent.done
                      ? "border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                      : "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                  }`}
                >
                  <Check className="h-4 w-4" />
                  {selectedEvent.done ? "Cofnij DONE" : "Oznacz DONE"}
                </button>
                <button
                  type="button"
                  onClick={() => startEditById(selectedEvent.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
                >
                  <Pencil className="h-4 w-4" /> Edytuj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
