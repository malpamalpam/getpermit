import { useTranslations } from "next-intl";
import type { CaseEvent, EventType } from "@prisma/client";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Send,
  Gavel,
  RotateCcw,
  Circle,
  type LucideIcon,
} from "lucide-react";

const EVENT_ICONS: Record<EventType, LucideIcon> = {
  APPLICATION_SUBMITTED: FileText,
  OFFICE_CONFIRMATION: CheckCircle2,
  SUPPLEMENT_REQUEST: AlertTriangle,
  SUPPLEMENT_SENT: Send,
  DECISION: Gavel,
  APPEAL: RotateCcw,
  OTHER: Circle,
};

const EVENT_COLORS: Record<EventType, string> = {
  APPLICATION_SUBMITTED: "bg-blue-100 text-blue-700",
  OFFICE_CONFIRMATION: "bg-green-100 text-green-700",
  SUPPLEMENT_REQUEST: "bg-orange-100 text-orange-700",
  SUPPLEMENT_SENT: "bg-amber-100 text-amber-700",
  DECISION: "bg-purple-100 text-purple-700",
  APPEAL: "bg-pink-100 text-pink-700",
  OTHER: "bg-gray-100 text-gray-700",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function CaseTimeline({ events }: { events: CaseEvent[] }) {
  const t = useTranslations("panel.case");
  const tEvent = useTranslations("eventType");

  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-primary/10 bg-white p-6 text-center text-sm text-ink/60">
        {t("noEvents")}
      </p>
    );
  }

  // Sortuj malejąco wg eventDate (najnowsze na górze)
  const sorted = [...events].sort(
    (a, b) => b.eventDate.getTime() - a.eventDate.getTime()
  );

  return (
    <ol className="relative space-y-6 border-l-2 border-primary/10 pl-8">
      {sorted.map((event) => {
        const Icon = EVENT_ICONS[event.eventType];
        return (
          <li key={event.id} className="relative">
            <span
              className={`absolute -left-[42px] flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-surface ${EVENT_COLORS[event.eventType]}`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="rounded-xl border border-primary/10 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-primary/50">
                    {tEvent(event.eventType)}
                  </div>
                  <h4 className="mt-1 font-display text-base font-bold text-primary">
                    {event.title}
                  </h4>
                </div>
                <time className="whitespace-nowrap text-xs text-ink/50">
                  {formatDate(event.eventDate)}
                </time>
              </div>
              {event.description && (
                <p className="mt-2 text-sm leading-relaxed text-ink/70">
                  {event.description}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
