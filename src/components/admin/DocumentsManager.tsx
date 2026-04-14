"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { useTranslations } from "next-intl";
import {
  uploadDocumentAction,
  deleteDocumentAction,
  updateDocumentVerificationAction,
} from "@/lib/admin-actions";
import type { Document, VerificationStatus } from "@prisma/client";
import {
  FileText,
  Upload,
  Trash2,
  Download,
  PackageOpen,
  ShieldCheck,
  AlertTriangle,
  Clock,
  User,
} from "lucide-react";

interface Props {
  caseId: string;
  documents: Document[];
}

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

function VerificationBadgeAdmin({
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
      label: t("pending"),
    },
    VERIFIED: {
      icon: ShieldCheck,
      className: "bg-green-100 text-green-700 border-green-200",
      label: t("verified"),
    },
    NEEDS_CORRECTION: {
      icon: AlertTriangle,
      className: "bg-orange-100 text-orange-700 border-orange-200",
      label: t("needsCorrection"),
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

export function DocumentsManager({ caseId, documents }: Props) {
  const t = useTranslations("admin.documentUpload");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setUploadError(null);
      setUploadingCount(acceptedFiles.length);

      startTransition(async () => {
        for (const file of acceptedFiles) {
          const fd = new FormData();
          fd.append("caseId", caseId);
          fd.append("file", file);
          const result = await uploadDocumentAction(fd);
          if (!result.ok) {
            setUploadError(
              t("uploadError", { message: result.error ?? "unknown" })
            );
            break;
          }
        }
        setUploadingCount(0);
        router.refresh();
      });
    },
    [caseId, router, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 20 * 1024 * 1024, // 20 MB
  });

  const handleDelete = (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    startTransition(async () => {
      await deleteDocumentAction(id, caseId);
      router.refresh();
    });
  };

  const handleVerify = (docId: string, status: VerificationStatus) => {
    startTransition(async () => {
      await updateDocumentVerificationAction(docId, status);
      router.refresh();
    });
  };

  const isClientDoc = (doc: Document) => doc.uploadedByUserId != null;

  return (
    <div>
      {/* Upload dropzone */}
      <div
        {...getRootProps()}
        className={`mb-5 cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragActive
            ? "border-accent bg-accent/5"
            : "border-primary/20 bg-surface hover:border-accent/40"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-3 h-8 w-8 text-primary/40" />
        <p className="text-sm text-primary/70">
          {isDragActive ? t("dropzoneActive") : t("dropzone")}
        </p>
        {uploadingCount > 0 && (
          <p className="mt-2 text-xs text-accent">
            {t("uploading", { count: uploadingCount })}
          </p>
        )}
      </div>

      {uploadError && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {uploadError}
        </p>
      )}

      {/* Download all ZIP */}
      {documents.length > 0 && (
        <div className="mb-4 flex justify-end">
          <a
            href={`/api/documents/download-all?caseId=${caseId}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/15 bg-white px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
          >
            <PackageOpen className="h-4 w-4" />
            {t("downloadAll")}
          </a>
        </div>
      )}

      {documents.length === 0 ? (
        <p className="rounded-xl border border-dashed border-primary/15 p-6 text-center text-sm text-ink/50">
          Brak dokumentów
        </p>
      ) : (
        <ul className="divide-y divide-primary/10 rounded-xl border border-primary/10 bg-white">
          {documents.map((doc) => (
            <li key={doc.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-primary">
                      {doc.fileName}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink/40">
                      <span>{formatBytes(doc.fileSize)}</span>
                      <span>·</span>
                      <span>{formatDate(doc.uploadedAt)}</span>
                      {doc.documentType && (
                        <>
                          <span>·</span>
                          <span className="text-ink/60">{t("docType")}: {doc.documentType}</span>
                        </>
                      )}
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {isClientDoc(doc) ? t("client") : t("staff")}
                      </span>
                    </div>
                    {doc.verificationStatus && (
                      <div className="mt-1">
                        <VerificationBadgeAdmin
                          status={doc.verificationStatus}
                          t={t}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <a
                    href={`/api/documents/${doc.id}/download`}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-primary/60 transition-colors hover:bg-primary/5 hover:text-primary"
                    aria-label="Download"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50"
                    aria-label="Delete"
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Verification actions for client-uploaded docs */}
              {isClientDoc(doc) && (
                <div className="mt-2 flex items-center gap-2 pl-[52px]">
                  <button
                    type="button"
                    onClick={() => handleVerify(doc.id, "VERIFIED")}
                    disabled={isPending || doc.verificationStatus === "VERIFIED"}
                    className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-white px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-50 disabled:opacity-40"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    {t("verify")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerify(doc.id, "NEEDS_CORRECTION")}
                    disabled={
                      isPending ||
                      doc.verificationStatus === "NEEDS_CORRECTION"
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-white px-2 py-1 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-50 disabled:opacity-40"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {t("needsCorrection")}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
