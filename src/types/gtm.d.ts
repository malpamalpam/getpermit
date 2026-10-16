interface Window {
  dataLayer: Record<string, unknown>[];
  gtag: (...args: unknown[]) => void;
  Cookiebot?: { renew: () => void; consent: Record<string, boolean> };
}
