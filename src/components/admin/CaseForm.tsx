"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import {
  createCaseAction,
  updateCaseAction,
  deleteCaseAction,
  type CaseFormValues,
} from "@/lib/admin-actions";
import { CaseType, CaseStatus, type Case, type User } from "@prisma/client";
import { CheckCircle2, AlertCircle, Save, Trash2 } from "lucide-react";

interface Props {
  mode: "create" | "edit";
  initialCase?: Case;
  clients: Pick<User, "id" | "email" | "firstName" | "lastName">[];
  staff: Pick<User, "id" | "email" | "firstName" | "lastName">[];
}

function dateToInput(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function CaseForm({ mode, initialCase, clients, staff }: Props) {
  const t = useTranslations("admin.caseForm");
  const tType = useTranslations("caseType");
  const tStatus = useTranslations("caseStatus");
  const router = useRouter();

  const [form, setForm] = useState<CaseFormValues>({
    userId: initialCase?.userId ?? "",
    type: initialCase?.type ?? CaseType.TEMPORARY_RESIDENCE,
    status: initialCase?.status ?? CaseStatus.SUBMITTED,
    title: initialCase?.title ?? "",
    description: initialCase?.description ?? "",
    submittedAt: dateToInput(initialCase?.submittedAt),
    expectedDecisionAt: dateToInput(initialCase?.expectedDecisionAt),
    assignedStaffId: initialCase?.assignedStaffId ?? "",
  });
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  const update = <K extends keyof CaseFormValues>(
    key: K,
    value: CaseFormValues[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createCaseAction(form)
          : await updateCaseAction(initialCase!.id, form);
      if (!result.ok) {
        setStatus("error");
        return;
      }
      setStatus("success");
      if (mode === "create" && "id" in result) {
        router.push(`/admin/sprawa/${result.id}`);
      } else {
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    if (!initialCase) return;
    if (!confirm(t("deleteConfirm"))) return;
    startTransition(async () => {
      await deleteCaseAction(initialCase.id);
    });
  };

  const inputBase =
    "block w-full rounded-md border border-primary/15 bg-white px-4 py-2.5 text-sm text-primary placeholder:text-primary/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:bg-surface";
  const labelBase = "block text-sm font-medium text-primary mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="userId" className={labelBase}>
            {t("field.client")} *
          </label>
          <select
            id="userId"
            required
            value={form.userId}
            onChange={(e) => update("userId", e.target.value)}
            className={inputBase}
          >
            <option value="">{t("noClient")}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName || c.lastName
                  ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
                  : c.email}{" "}
                · {c.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="assignedStaffId" className={labelBase}>
            {t("field.assignedStaff")}
          </label>
          <select
            id="assignedStaffId"
            value={form.assignedStaffId}
            onChange={(e) => update("assignedStaffId", e.target.value)}
            className={inputBase}
          >
            <option value="">{t("noStaff")}</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName || s.lastName
                  ? `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim()
                  : s.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="type" className={labelBase}>
            {t("field.type")} *
          </label>
          <select
            id="type"
            required
            value={form.type}
            onChange={(e) => update("type", e.target.value as CaseType)}
            className={inputBase}
          >
            {Object.values(CaseType).map((ty) => (
              <option key={ty} value={ty}>
                {tType(ty)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="status" className={labelBase}>
            {t("field.status")} *
          </label>
          <select
            id="status"
            required
            value={form.status}
            onChange={(e) => update("status", e.target.value as CaseStatus)}
            className={inputBase}
          >
            {Object.values(CaseStatus).map((s) => (
              <option key={s} value={s}>
                {tStatus(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="title" className={labelBase}>
          {t("field.title")} *
        </label>
        <input
          id="title"
          type="text"
          required
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder={t("field.titlePlaceholder")}
          className={inputBase}
        />
      </div>

      <div>
        <label htmlFor="description" className={labelBase}>
          {t("field.description")}
        </label>
        <textarea
          id="description"
          rows={4}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          className={`${inputBase} resize-none`}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="submittedAt" className={labelBase}>
            {t("field.submittedAt")}
          </label>
          <input
            id="submittedAt"
            type="date"
            value={form.submittedAt}
            onChange={(e) => update("submittedAt", e.target.value)}
            className={inputBase}
          />
        </div>
        <div>
          <label htmlFor="expectedDecisionAt" className={labelBase}>
            {t("field.expectedDecisionAt")}
          </label>
          <input
            id="expectedDecisionAt"
            type="date"
            value={form.expectedDecisionAt}
            onChange={(e) => update("expectedDecisionAt", e.target.value)}
            className={inputBase}
          />
        </div>
      </div>

      {status === "success" && (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{t("saved")}</span>
        </div>
      )}
      {status === "error" && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{t("saveError")}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-primary/10 pt-5">
        <Button type="submit" variant="accent" size="md" disabled={isPending}>
          <Save className="h-4 w-4" />
          {isPending ? t("saving") : t("saveButton")}
        </Button>

        {mode === "edit" && (
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4" />
            {t("deleteButton")}
          </button>
        )}
      </div>
    </form>
  );
}
