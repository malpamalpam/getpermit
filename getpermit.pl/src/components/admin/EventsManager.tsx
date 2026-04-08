"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { createEventAction, deleteEventAction } from "@/lib/admin-actions";
import { EventType, type CaseEvent } from "@prisma/client";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  caseId: string;
  events: CaseEvent[];
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function EventsManager({ caseId, events }: Props) {
  const t = useTranslations("admin.eventForm");
  const tEvent = useTranslations("eventType");
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [eventType, setEventType] = useState<EventType>(
    EventType.APPLICATION_SUBMITTED
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [isPending, startTransition] = useTransition();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await createEventAction({
        caseId,
        eventType,
        title,
        description,
        eventDate,
      });
      if (result.ok) {
        setTitle("");
        setDescription("");
        setEventDate(new Date().toISOString().slice(0, 10));
        setShowForm(false);
        router.refresh();
      }
    });
  };

  const handleDelete = (eventId: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    startTransition(async () => {
      await deleteEventAction(eventId, caseId);
      router.refresh();
    });
  };

  const inputBase =
    "block w-full rounded-md border border-primary/15 bg-white px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

  const sorted = [...events].sort(
    (a, b) => b.eventDate.getTime() - a.eventDate.getTime()
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary/60">
          {events.length} {events.length === 1 ? "wydarzenie" : "wydarzeń"}
        </span>
        {!showForm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            {t("addButton")}
          </Button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="mb-5 space-y-3 rounded-xl border border-primary/10 bg-surface p-4"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-primary">
                {t("type")}
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as EventType)}
                className={inputBase}
              >
                {Object.values(EventType).map((et) => (
                  <option key={et} value={et}>
                    {tEvent(et)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-primary">
                {t("eventDate")}
              </label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className={inputBase}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-primary">
              {t("title")}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              className={inputBase}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-primary">
              {t("description")}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputBase} resize-none`}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="accent" size="sm" disabled={isPending}>
              {isPending ? t("saving") : t("save")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Anuluj
            </Button>
          </div>
        </form>
      )}

      {sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-primary/15 p-6 text-center text-sm text-ink/50">
          Brak wydarzeń
        </p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((event) => (
            <li
              key={event.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-primary/10 bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold uppercase tracking-wider text-accent">
                    {tEvent(event.eventType)}
                  </span>
                  <span className="text-ink/40">·</span>
                  <time className="text-ink/60">
                    {formatDate(event.eventDate)}
                  </time>
                </div>
                <h4 className="mt-1 text-sm font-bold text-primary">
                  {event.title}
                </h4>
                {event.description && (
                  <p className="mt-1 text-sm text-ink/70">{event.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(event.id)}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50"
                aria-label={t("delete")}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
