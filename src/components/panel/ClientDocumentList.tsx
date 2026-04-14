"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { deleteClientDocumentAction } from "@/lib/client-actions";
import type { Document, DocumentType, VerificationStatus } from "@prisma/client";
import { FileText, Download, Trash2, ShieldCheck, AlertTriangle, Clock } from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function VerificationBadge({
  status,
  t,
}: {
  status: VerificationStatus | null;
  t: (key: string) => string;
}) {
  if (!status) return null;

  const config: Record<
    VerificationStatus,
    { icon: typeof ShieldCheck; className: string; label: string }
  > = {
    PENDING: {
      icon: Clock,
      className: "bg-gray-100 text-gray-600 border-gray-200",
      label: t("verificationPending"),
    },
    VERIFIED: {
      icon: ShieldCheck,
      className: "bg-green-100 text-green-700 border-green-200",
      label: t("verificationVerified"),
    },
    NEEDS_CORRECTION: {
      icon: AlertTriangle,
      className: "bg-orange-100 text-orange-700 border-orange-200",
      label: t("verificationNeedsCorrection"),
    },
  };

  const { icon: Icon, className, label } = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${className}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

interface Props {
  documents: Document[];
  currentUserId: string;
  caseId: string;
}

export function ClientDocumentList({
  documents,
  currentUserId,
  caseId,
}: Props) {
  const t = useTranslations("panel.case");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const clientDocs = documents.filter((d) => d.uploadedByUserId != null);
  const staffDocs = documents.filter(
    (d) => d.uploadedByUserId == null
  );

  const handleDelete = (docId: string) => {
    if (!confirm(t("deleteDocConfirm"))) return;
    startTransition(async () => {
      await deleteClientDocumentAction(docId, caseId);
      router.refresh();
    });
  };

  const renderDocTypeLabel = (doc: Document) => {
    if (doc.documentType) {
      const label = t(`docType.${doc.documentType}`);
      if (doc.documentType === "OTHER" && doc.description) {
        return `${label}: ${doc.description}`;
      }
      return label;
    }
    return doc.description || null;
  };

  const renderDocList = (
    docs: Document[],
    showDelete: boolean
  ) => {
    if (docs.length === 0) {
      return (
        <p className="rounded-xl border border-dashed border-primary/15 p-4 text-center text-sm text-ink/50">
          {t("noDocuments")}
        </p>
      );
    }
    return (
      <ul className="divide-y divide-primary/10 rounded-xl border border-primary/10 bg-white">
        {docs.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-surface"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-primary">
                  {doc.fileName}
                </div>
                {renderDocTypeLabel(doc) && (
                  <div className="truncate text-xs text-ink/60">
                    {renderDocTypeLabel(doc)}
                  </div>
                )}
                <div className="mt-0.5 flex items-center gap-2 text-xs text-ink/40">
                  <span>{formatBytes(doc.fileSize)}</span>
                  <span>·</span>
                  <span>{formatDate(doc.uploadedAt)}</span>
                </div>
                {doc.verificationStatus && (
                  <div className="mt-1">
                    <VerificationBadge status={doc.verificationStatus} t={t} />
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
              <a
                href={`/api/documents/${doc.id}/download`}
                className="inline-flex items-center gap-1.5 rounded-md border border-primary/15 bg-white px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
              >
                <Download className="h-4 w-4" />
              </a>
              {showDelete && doc.uploadedByUserId === currentUserId && (
                <button
                  type="button"
                  onClick={() => handleDelete(doc.id)}
                  disabled={isPending}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="space-y-6">
      {/* Client documents */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary/60">
          {t("yourDocuments")}
        </h3>
        {renderDocList(clientDocs, true)}
      </div>

      {/* Staff documents */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary/60">
          {t("staffDocuments")}
        </h3>
        {renderDocList(staffDocs, false)}
      </div>
    </div>
  );
}
