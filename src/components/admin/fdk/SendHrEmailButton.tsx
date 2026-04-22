"use client";

import { useState, useTransition } from "react";
import { sendHrContractEmailAction } from "@/lib/fdk-actions";
import { Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export function SendHrEmailButton({ foreignerId }: { foreignerId: number }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleClick = () => {
    setStatus("idle");
    startTransition(async () => {
      const result = await sendHrContractEmailAction(foreignerId);
      setStatus(result.ok ? "success" : "error");
    });
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        {isPending ? "Wysyłanie..." : "Przygotuj umowę (wyślij email)"}
      </button>
      {status === "success" && (
        <span className="inline-flex items-center gap-1 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" /> Wysłano
        </span>
      )}
      {status === "error" && (
        <span className="inline-flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" /> Błąd wysyłki
        </span>
      )}
    </div>
  );
}
