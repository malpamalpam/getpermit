import { useTranslations } from "next-intl";
import type { Document } from "@prisma/client";
import { FileText, Download } from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({ documents }: { documents: Document[] }) {
  const t = useTranslations("panel.case");

  if (documents.length === 0) {
    return (
      <p className="rounded-xl border border-primary/10 bg-white p-6 text-center text-sm text-ink/60">
        {t("noDocuments")}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-primary/10 rounded-xl border border-primary/10 bg-white">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-surface"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-primary">
                {doc.fileName}
              </div>
              {doc.description && (
                <div className="truncate text-xs text-ink/60">
                  {doc.description}
                </div>
              )}
              <div className="mt-0.5 text-xs text-ink/40">
                {t("fileSize")}: {formatBytes(doc.fileSize)}
              </div>
            </div>
          </div>
          <a
            href={`/api/documents/${doc.id}/download`}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md border border-primary/15 bg-white px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
          >
            <Download className="h-4 w-4" />
            {t("downloadButton")}
          </a>
        </li>
      ))}
    </ul>
  );
}
