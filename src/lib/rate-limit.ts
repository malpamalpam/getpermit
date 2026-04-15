/**
 * Prosty in-memory rate limiter. Na Vercel (serverless) działa per-instance,
 * co oznacza że limity resetują się przy cold start — ale nadal chroni przed
 * podstawowymi atakami brute-force i spamem w ramach jednej instancji.
 *
 * Dla pełnej ochrony w produkcji rozważ Redis-based rate limiting (Upstash).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Czyść stare wpisy co 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000);

interface RateLimitConfig {
  /** Maksymalna liczba żądań w oknie */
  maxRequests: number;
  /** Okno czasowe w sekundach */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Sprawdza rate limit dla danego klucza.
 * @param key - Unikalny identyfikator (np. `login:${ip}` lub `upload:${userId}`)
 * @param config - Konfiguracja limitu
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // Nowe okno
    store.set(key, {
      count: 1,
      resetAt: now + config.windowSeconds * 1000,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      retryAfterSeconds: 0,
    };
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: retryAfter,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    retryAfterSeconds: 0,
  };
}

/**
 * Predefiniowane limity dla różnych operacji.
 */
export const RATE_LIMITS = {
  /** Logowanie: 10 prób / 15 min na IP */
  login: { maxRequests: 10, windowSeconds: 900 },
  /** Rejestracja: 5 kont / 1h na IP */
  register: { maxRequests: 5, windowSeconds: 3600 },
  /** Reset hasła: 5 żądań / 1h na IP */
  resetPassword: { maxRequests: 5, windowSeconds: 3600 },
  /** Wysyłanie wiadomości: 30 / 5 min na użytkownika */
  message: { maxRequests: 30, windowSeconds: 300 },
  /** Upload dokumentów: 20 / 10 min na użytkownika */
  upload: { maxRequests: 20, windowSeconds: 600 },
  /** Formularz kontaktowy: 5 / 1h na IP */
  contact: { maxRequests: 5, windowSeconds: 3600 },
} as const;
