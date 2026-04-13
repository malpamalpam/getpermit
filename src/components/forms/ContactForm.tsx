"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations, useLocale } from "next-intl";
import { contactFormSchema, type ContactFormValues } from "@/lib/validations";
import { Button } from "@/components/ui/Button";
import { ALL_SERVICES, localized } from "@/lib/services";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContactFormProps {
  defaultService?: string;
  compact?: boolean;
}

type FormStatus = "idle" | "submitting" | "success" | "error";

export function ContactForm({ defaultService, compact }: ContactFormProps) {
  const t = useTranslations("contact.form");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const [status, setStatus] = useState<FormStatus>("idle");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      service: defaultService ?? "",
      message: "",
      consent: undefined as unknown as true,
      website: "",
    },
  });

  const onSubmit = async (values: ContactFormValues) => {
    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, locale }),
      });
      if (!res.ok) throw new Error("Network error");
      setStatus("success");
      reset();
    } catch {
      setStatus("error");
    }
  };

  const translateError = (key?: string) => {
    if (!key) return undefined;
    if (key === "email") return tErrors("email");
    if (key === "consent") return tErrors("consent");
    if (key.startsWith("min:")) {
      return tErrors("minLength", { min: key.split(":")[1] });
    }
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
    <form onSubmit={handleSubmit(onSubmit)} className={cn("space-y-4", compact && "space-y-3")} noValidate>
      {/* Honeypot */}
      <input
        {...register("website")}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        className="absolute left-[-9999px]"
        aria-hidden="true"
      />

      <div>
        <label htmlFor="name" className={labelBase}>
          {t("name")} <span className="text-accent">*</span>
        </label>
        <input
          id="name"
          {...register("name")}
          type="text"
          placeholder={t("namePlaceholder")}
          className={inputBase}
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-600">{translateError(errors.name.message)}</p>
        )}
      </div>

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
