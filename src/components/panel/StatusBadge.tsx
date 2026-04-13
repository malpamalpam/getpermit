import { useTranslations } from "next-intl";
import type { CaseStatus } from "@prisma/client";

const STATUS_STYLES: Record<CaseStatus, string> = {
  SUBMITTED: "bg-blue-100 text-blue-800 border-blue-200",
  IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200",
  SUPPLEMENT_REQUIRED: "bg-orange-100 text-orange-800 border-orange-200",
  DECISION_POSITIVE: "bg-green-100 text-green-800 border-green-200",
  DECISION_NEGATIVE: "bg-red-100 text-red-800 border-red-200",
  APPEAL: "bg-purple-100 text-purple-800 border-purple-200",
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  const t = useTranslations("caseStatus");
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {t(status)}
    </span>
  );
}
