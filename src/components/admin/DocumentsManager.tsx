"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { useTranslations } from "next-intl";
import {
  uploadDocumentAction,
  deleteDocumentAction,
} from "@/lib/admin-actions";
import type { Document } from "@prisma/client";
import { FileText, Upload, Trash2, Download } from "lucide-react";

interface Props {
  caseId: string;
  documents: Document[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  return (
    <div>
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

      {documents.length === 0 ? (
        <p className="rounded-xl border border-dashed border-primary/15 p-6 text-center text-sm text-ink/50">
          Brak dokumentów
        </p>
      ) : (
        <ul className="divide-y divide-primary/10 rounded-xl border border-primary/10 bg-white">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-3 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-primary">
                    {doc.fileName}
                  </div>
                  <div className="mt-0.5 text-xs text-ink/40">
                    {formatBytes(doc.fileSize)}
                  </div>
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
