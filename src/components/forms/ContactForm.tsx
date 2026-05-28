"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations, useLocale } from "next-intl";
import { contactFormSchema, type ContactFormValues } from "@/lib/validations";
import { Button } from "@/components/ui/Button";
import { ALL_SERVICES, localized } from "@/lib/services";
import { CheckCircle2, AlertCircle, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackFormSubmit, trackFormError, trackFormStart } from "@/lib/gtm";

interface ContactFormProps {
  defaultService?: string;
  compact?: boolean;
}

type FormStatus = "idle" | "submitting" | "success" | "error";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function ContactForm({ defaultService, compact }: ContactFormProps) {
  const t = useTranslations("contact.form");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const [status, setStatus] = useState<FormStatus>("idle");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formStarted = useRef(false);
  const formName = compact ? "sidebar_consultation" : "contact";

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    mode: "onBlur",
    defaultValues: {
      senderType: undefined as unknown as "firma",
      companyName: "",
      fullName: "",
      email: "",
      phone: "",
      service: defaultService ?? "",
      message: "",
      consent: undefined as unknown as true,
      website: "",
    },
  });

  const senderType = watch("senderType");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const tooBig = selected.find((f) => f.size > MAX_FILE_SIZE);
    const wrongType = selected.find((f) => !ALLOWED_TYPES.includes(f.type));

    if (tooBig) {
      setFileError(t("attachmentsFileTooLarge", { name: tooBig.name }));
      setFiles([]);
      return;
    }
    if (wrongType) {
      setFileError(t("attachmentsInvalidType", { name: wrongType.name }));
      setFiles([]);
      return;
    }
    setFileError(null);
    setFiles(selected);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (values: ContactFormValues) => {
    if (fileError) return;
    setStatus("submitting");

    const formData = new FormData();
    formData.append("senderType", values.senderType);
    if (values.senderType === "firma") formData.append("companyName", values.companyName ?? "");
    if (values.senderType === "cudzoziemiec") formData.append("fullName", values.fullName ?? "");
    formData.append("email", values.email);
    formData.append("phone", values.phone ?? "");
    formData.append("service", values.service ?? "");
    formData.append("message", values.message);
    formData.append("consent", "true");
    formData.append("website", values.website ?? "");
    formData.append("locale", locale);
    files.forEach((f) => formData.append("attachments", f));

    try {
      const res = await fetch("/api/contact", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Network error");
      setStatus("success");
      trackFormSubmit(formName, values.service, locale);
      reset();
      setFiles([]);
    } catch {
      setStatus("error");
      trackFormError(formName, "network_error");
    }
  };

  const translateError = (key?: string) => {
    if (!key) return undefined;
    if (key === "email") return tErrors("email");
    if (key === "consent") return tErrors("consent");
    if (key.startsWith("min:")) return tErrors("minLength", { min: key.split(":")[1] });
    return tErrors("required");
  };

  const inputBase =
    "block w-full rounded-md border border-primary/15 bg-white px-4 py-2.5 text-sm text-primary placeholder:text-primary/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

  const labelBase = "block text-sm font-medium text-primary mb-1.5";

  if (status === "success") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
        <p className="mt-4 text-sm font-medium text-green-900">{t("success")}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn("space-y-4", compact && "space-y-3")}
      noValidate
      onFocus={() => {
        if (!formStarted.current) {
          formStarted.current = true;
          trackFormStart(formName);
        }
      }}
    >
      {/* Honeypot */}
      <input
        {...register("website")}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        className="absolute left-[-9999px]"
        aria-hidden="true"
      />

      {/* Sender type */}
      <div>
        <span className={labelBase}>
          {t("senderType")} <span className="text-accent">*</span>
        </span>
        <div className="mt-1 flex gap-4">
          {(["firma", "cudzoziemiec"] as const).map((val) => (
            <label key={val} className="flex cursor-pointer items-center gap-2 text-sm text-primary">
              <input
                {...register("senderType")}
                type="radio"
                value={val}
                className="h-4 w-4 cursor-pointer text-accent focus:ring-accent"
              />
              {val === "firma" ? t("senderTypeFirma") : t("senderTypeCudzoziemiec")}
            </label>
          ))}
        </div>
        {errors.senderType && (
          <p className="mt-1 text-xs text-red-600">{translateError(errors.senderType.message)}</p>
        )}
      </div>

      {/* Conditional: company name */}
      {senderType === "firma" && (
        <div>
          <label htmlFor="companyName" className={labelBase}>
            {t("companyName")} <span className="text-accent">*</span>
          </label>
          <input
            id="companyName"
            {...register("companyName")}
            type="text"
            placeholder={t("companyNamePlaceholder")}
            className={inputBase}
            aria-invalid={!!errors.companyName}
          />
          {errors.companyName && (
            <p className="mt-1 text-xs text-red-600">{translateError(errors.companyName.message)}</p>
          )}
        </div>
      )}

      {/* Conditional: full name */}
      {senderType === "cudzoziemiec" && (
        <div>
          <label htmlFor="fullName" className={labelBase}>
            {t("fullName")} <span className="text-accent">*</span>
          </label>
          <input
            id="fullName"
            {...register("fullName")}
            type="text"
            placeholder={t("fullNamePlaceholder")}
            className={inputBase}
            aria-invalid={!!errors.fullName}
          />
          {errors.fullName && (
            <p className="mt-1 text-xs text-red-600">{translateError(errors.fullName.message)}</p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="email" className={labelBase}>
          {t("email")} <span className="text-accent">*</span>
        </label>
        <input
          id="email"
          {...register("email")}
          type="email"
          placeholder={t("emailPlaceholder")}
          className={inputBase}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-600">{translateError(errors.email.message)}</p>
        )}
      </div>

      {!compact && (
        <div>
          <label htmlFor="phone" className={labelBase}>
            {t("phone")}
          </label>
          <input
            id="phone"
            {...register("phone")}
            type="tel"
            placeholder={t("phonePlaceholder")}
            className={inputBase}
          />
        </div>
      )}

      <div>
        <label htmlFor="service" className={labelBase}>
          {t("service")}
        </label>
        <select
          id="service"
          {...register("service")}
          className={inputBase}
          defaultValue={defaultService ?? ""}
        >
          <option value="">{t("servicePlaceholder")}</option>
          {ALL_SERVICES.map((s) => (
            <option key={s.slug} value={s.slug}>
              {localized(s.title, locale)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="message" className={labelBase}>
          {t("message")} <span className="text-accent">*</span>
        </label>
        <textarea
          id="message"
          {...register("message")}
          rows={compact ? 3 : 5}
          placeholder={t("messagePlaceholder")}
          className={cn(inputBase, "resize-none")}
          aria-invalid={!!errors.message}
        />
        {errors.message && (
          <p className="mt-1 text-xs text-red-600">{translateError(errors.message.message)}</p>
        )}
      </div>

      {/* File attachments — hidden in compact mode */}
      {!compact && (
        <div>
          <span className={labelBase}>{t("attachments")}</span>
          <p className="mb-2 text-xs text-primary/50">{t("attachmentsHint")}</p>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-primary/20 px-4 py-3 text-sm text-primary/60 hover:border-accent/40 hover:text-accent transition-colors">
            <Paperclip className="h-4 w-4 flex-shrink-0" />
            <span>{files.length > 0 ? `${files.length} plik(i) wybrano` : "Kliknij, aby dodać pliki"}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg"
              multiple
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>
          {fileError && (
            <p className="mt-1 text-xs text-red-600">{fileError}</p>
          )}
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between rounded-md bg-primary/5 px-3 py-1.5 text-xs text-primary">
                  <span className="truncate max-w-[240px]">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="ml-2 flex-shrink-0 text-primary/40 hover:text-red-500"
                    aria-label="Usuń plik"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <label className="flex cursor-pointer items-start gap-2.5 text-xs text-primary/70">
        <input
          {...register("consent")}
          type="checkbox"
          className="mt-0.5 h-4 w-4 cursor-pointer rounded border-primary/30 text-accent focus:ring-accent"
        />
        <span>{t("consent")} <span className="text-accent">*</span></span>
      </label>
      {errors.consent && (
        <p className="text-xs text-red-600">{translateError(errors.consent.message)}</p>
      )}

      <Button
        type="submit"
        variant="accent"
        size={compact ? "md" : "lg"}
        className="w-full"
        disabled={status === "submitting"}
      >
        {status === "submitting" ? t("submitting") : t("submit")}
      </Button>

      {status === "error" && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{t("error")}</span>
        </div>
      )}
    </form>
  );
}
