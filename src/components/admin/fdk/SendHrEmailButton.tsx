"use client";

import { useState, useTransition } from "react";
import { getHrEmailPreviewAction, sendHrContractEmailAction } from "@/lib/fdk-actions";
import { Mail, Loader2, CheckCircle2, AlertCircle, Eye, X, Send } from "lucide-react";

export function SendHrEmailButton({ foreignerId }: { foreignerId: number }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState<{ subject: string; html: string; to: string } | null>(null);
  const [customNotes, setCustomNotes] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(null);

  const handlePreview = () => {
    setStatus("idle");
    setPreviewError(null);
    startTransition(async () => {
      const result = await getHrEmailPreviewAction(foreignerId);
      if (result.ok) {
        setPreview(result);
        setShowPreview(true);
      } else {
        setPreviewError(
          result.error === "no_contracts"
            ? "Brak kontraktów HR do wysłania."
            : "Błąd ładowania podglądu."
        );
      }
    });
  };

  const handleSend = () => {
    setStatus("idle");
    startTransition(async () => {
      const result = await sendHrContractEmailAction(foreignerId, customNotes);
      setStatus(result.ok ? "success" : "error");
      if (result.ok) {
        setShowPreview(false);
        setCustomNotes("");
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          onClick={handlePreview}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {isPending && !showPreview ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          Przygotuj umowę (podgląd email)
        </button>
        {status === "success" && (
          <span className="inline-flex items-center gap-1 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" /> Wysłano
          </span>
        )}
        {(status === "error" || previewError) && (
          <span className="inline-flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" /> {previewError ?? "Błąd wysyłki"}
          </span>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-primary">
                Podgląd wiadomości do HR
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="rounded-lg p-1.5 text-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-3 text-sm">
              <div className="flex gap-2">
                <span className="text-primary/50">Do:</span>
                <span className="font-medium">{preview.to}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-primary/50">Temat:</span>
                <span className="font-medium">{preview.subject}</span>
              </div>
            </div>

            <div
              className="mb-4 rounded-lg border border-primary/10 bg-gray-50 p-4 text-sm"
              dangerouslySetInnerHTML={{ __html: preview.html }}
            />

            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-primary">
                Dodatkowe uwagi / komentarz (opcjonalnie)
              </label>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Wpisz dodatkowe uwagi, które zostaną dołączone do wiadomości..."
                className="block w-full rounded-md border border-primary/15 bg-white px-3 py-2 text-sm text-primary placeholder:text-primary/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="rounded-lg border border-primary/15 px-4 py-2 text-sm font-medium text-primary/60 hover:bg-primary/5"
              >
                Anuluj
              </button>
              <button
                onClick={handleSend}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isPending ? "Wysyłanie..." : "Wyślij email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
