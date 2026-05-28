"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, AlertCircle, CreditCard, Loader2 } from "lucide-react";

interface AcceptanceFormProps {
  alreadyAccepted: boolean;
  alreadyPaid: boolean;
  paymentCancelled: boolean;
  amountPln: number | null;
}

export function AcceptanceForm({
  alreadyAccepted,
  alreadyPaid,
  paymentCancelled,
  amountPln,
}: AcceptanceFormProps) {
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [contract, setContract] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(alreadyAccepted);
  const [paid] = useState(alreadyPaid);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const allChecked = terms && privacy && contract;

  const handleAccept = async () => {
    if (!allChecked) return;
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch("/api/panel/accept-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          termsAccepted: true,
          privacyAccepted: true,
          contractAccepted: true,
        }),
      });
      if (!res.ok) throw new Error("Błąd serwera");
      setAccepted(true);
    } catch {
      setError("Wystąpił błąd. Spróbuj ponownie.");
    } finally {
      setAccepting(false);
    }
  };

  const handlePayment = async () => {
    setCheckoutLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/paypal/create-order", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Błąd płatności");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Błąd połączenia. Spróbuj ponownie.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (paid) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
        <h3 className="mt-4 font-display text-xl font-bold text-green-900">
          Płatność potwierdzona
        </h3>
        <p className="mt-2 text-sm text-green-700">
          Dokumenty zostały zaakceptowane i płatność zrealizowana.
          Administrator wkrótce przystąpi do realizacji Twojej sprawy.
        </p>
      </div>
    );
  }

  if (!accepted) {
    return (
      <div className="space-y-6">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-3">
          <CheckboxRow
            id="terms"
            checked={terms}
            onChange={setTerms}
            label="Akceptuję regulamin świadczonych usług"
          />
          <CheckboxRow
            id="privacy"
            checked={privacy}
            onChange={setPrivacy}
            label="Akceptuję politykę prywatności i wyrażam zgodę na przetwarzanie moich danych osobowych zgodnie z RODO"
          />
          <CheckboxRow
            id="contract"
            checked={contract}
            onChange={setContract}
            label="Akceptuję umowę o świadczenie usług legalizacyjnych"
          />
        </div>

        <p className="text-xs text-primary/50">
          * Wszystkie checkboxy są wymagane przed zaakceptowaniem dokumentów.
        </p>

        <Button
          onClick={handleAccept}
          disabled={!allChecked || accepting}
          variant="primary"
          size="lg"
          className="w-full"
        >
          {accepting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Zapisywanie...
            </>
          ) : (
            "Zaakceptuj dokumenty"
          )}
        </Button>
      </div>
    );
  }

  // Accepted, not paid — show payment
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
        Dokumenty zaakceptowane — możesz teraz przejść do płatności.
      </div>

      {paymentCancelled && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          Płatność została anulowana. Możesz spróbować ponownie.
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {amountPln !== null && amountPln > 0 ? (
        <div className="rounded-xl border border-primary/10 bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-primary/60">Kwota do zapłaty</p>
          <p className="mt-1 font-display text-3xl font-bold text-primary">
            {amountPln.toLocaleString("pl-PL")} zł
          </p>
          <p className="mt-1 text-xs text-primary/40">Płatność jednorazowa</p>
          <Button
            onClick={handlePayment}
            disabled={checkoutLoading}
            variant="accent"
            size="lg"
            className="mt-6 w-full"
          >
            {checkoutLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Przekierowanie...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                Przejdź do płatności
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-primary/10 bg-surface p-6 text-center text-sm text-primary/60">
          Kwota zostanie ustalona indywidualnie przez opiekuna sprawy.
          Otrzymasz powiadomienie, gdy płatność będzie gotowa.
        </div>
      )}
    </div>
  );
}

function CheckboxRow({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg border border-primary/10 bg-white p-4 transition-colors hover:border-accent/30"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 cursor-pointer rounded border-primary/30 text-accent focus:ring-accent"
      />
      <span className="text-sm text-primary">{label}</span>
    </label>
  );
}
