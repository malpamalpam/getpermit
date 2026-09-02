const TEXTS: Record<string, string> = {
  pl: "Stan prawny na dzień: sierpień 2026. Kwoty opłat i terminy mogą ulec zmianie — przed złożeniem wniosku potwierdzamy je indywidualnie.",
  en: "Legal status as of August 2026. Fees and deadlines may change — we confirm them individually before filing.",
  ru: "Правовое состояние по состоянию на август 2026 г. Размеры сборов и сроки могут измениться — перед подачей заявления мы подтверждаем их индивидуально.",
  uk: "Правовий стан станом на серпень 2026 р. Розміри зборів і строки можуть змінитися — перед поданням заяви ми підтверджуємо їх індивідуально.",
};

export function LegalDisclaimer({ locale = "pl" }: { locale?: string }) {
  return (
    <div className="mt-8 rounded-lg border border-primary/10 bg-surface/50 px-4 py-3 text-xs text-primary/50">
      {TEXTS[locale] ?? TEXTS.pl}
    </div>
  );
}
