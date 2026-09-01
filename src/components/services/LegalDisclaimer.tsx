export function LegalDisclaimer({ date = "2026-08" }: { date?: string }) {
  return (
    <div className="mt-8 rounded-lg border border-primary/10 bg-surface/50 px-4 py-3 text-xs text-primary/50">
      Stan prawny na dzień: {date === "2026-08" ? "sierpień 2026" : date}. Kwoty opłat i terminy mogą ulec zmianie — przed złożeniem wniosku potwierdzamy je indywidualnie.
    </div>
  );
}
