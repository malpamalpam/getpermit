"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { useTranslations } from "next-intl";
import { uploadClientDocumentAction } from "@/lib/client-actions";
import { DocumentType } from "@prisma/client";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";

const ACCEPTED_TYPES = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "application/pdf": [".pdf"],
};
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

interface Props {
  caseId: string;
}

export function ClientDocumentUpload({ caseId }: Props) {
  const t = useTranslations("panel.case");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [documentType, setDocumentType] = useState<string>("");
  const [customDescription, setCustomDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: unknown[]) => {
    if (rejectedFiles && (rejectedFiles as Array<unknown>).length > 0) {
      setStatus("error");
      setErrorMessage(t("invalidFileType"));
      return;
    }
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.size > MAX_SIZE) {
        setStatus("error");
        setErrorMessage(t("fileTooLarge"));
        return;
      }
      setSelectedFile(file);
      setStatus("idle");
      setErrorMessage("");
    }
  }, [t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !documentType) return;

    setStatus("idle");
    startTransition(async () => {
      const fd = new FormData();
      fd.append("caseId", caseId);
      fd.append("file", selectedFile);
      fd.append("documentType", documentType);
      if (documentType === "OTHER" && customDescription) {
        fd.append("customDescription", customDescription);
      }

      const result = await uploadClientDocumentAction(fd);
      if (result.ok) {
        setStatus("success");
        setSelectedFile(null);
        setDocumentType("");
        setCustomDescription("");
        router.refresh();
      } else {
        setStatus("error");
        const errorKey =
          result.error === "invalid_file_type"
            ? t("invalidFileType")
            : result.error === "file_too_large"
              ? t("fileTooLarge")
              : t("uploadError", { message: result.error ?? "" });
        setErrorMessage(errorKey);
      }
    });
  };

  const inputBase =
    "block w-full rounded-md border border-primary/15 bg-white px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-primary/10 bg-white p-5">
      <h3 className="font-display text-base font-bold text-primary">
        {t("uploadDocument")}
      </h3>

      {/* Document type selector */}
      <div>
        <select
          required
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className={inputBase}
        >
          <option value="">{t("selectDocType")}</option>
          {Object.values(DocumentType).map((dt) => (
            <option key={dt} value={dt}>
              {t(`docType.${dt}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Custom description for OTHER */}
      {documentType === "OTHER" && (
        <div>
          <input
            type="text"
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            placeholder={t("customDescription")}
            className={inputBase}
            required
          />
        </div>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          isDragActive
            ? "border-accent bg-accent/5"
            : "border-primary/20 bg-surface hover:border-accent/40"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-2 h-6 w-6 text-primary/40" />
        {selectedFile ? (
          <p className="text-sm font-medium text-primary">{selectedFile.name}</p>
        ) : (
          <p className="text-sm text-primary/70">
            {isDragActive
              ? "Upuść plik tutaj..."
              : t("allowedFormats") + " · " + t("maxFileSize")}
          </p>
        )}
      </div>

      {/* Status messages */}
      {status === "success" && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{t("uploadSuccess")}</span>
        </div>
      )}
      {status === "error" && errorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending || !selectedFile || !documentType}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
      >
        <Upload className="h-4 w-4" />
        {isPending ? t("uploading") : t("uploadButton")}
      </button>
    </form>
  );
}
