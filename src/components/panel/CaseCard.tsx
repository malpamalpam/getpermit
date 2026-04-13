import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Case } from "@prisma/client";
import { StatusBadge } from "./StatusBadge";
import { Calendar, ChevronRight } from "lucide-react";

interface Props {
  case: Case;
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function CaseCard({ case: c }: Props) {
  const t = useTranslations("panel.dashboard");
  const tType = useTranslations("caseType");

  return (
    <Link
      href={`/panel/sprawa/${c.id}`}
      className="group flex flex-col gap-4 rounded-2xl border border-primary/10 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-accent">
            {tType(c.type)}
          </div>
          <h3 className="mt-1 font-display text-lg font-bold text-primary">
            {c.title}
          </h3>
        </div>
        <StatusBadge status={c.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-primary/5 pt-4 text-xs">
        <div>
          <div className="flex items-center gap-1.5 text-primary/50">
            <Calendar className="h-3 w-3" />
            {t("submittedAt")}
          </div>
          <div className="mt-1 font-medium text-primary">
            {formatDate(c.submittedAt)}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-primary/50">
            <Calendar className="h-3 w-3" />
            {t("expectedDecision")}
          </div>
          <div className="mt-1 font-medium text-primary">
            {formatDate(c.expectedDecisionAt)}
          </div>
        </div>
      </div>

      <div className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition-transform group-hover:translate-x-1">
        {t("viewDetails")}
        <ChevronRight className="h-4 w-4" />
      </div>
    </Link>
  );
}
