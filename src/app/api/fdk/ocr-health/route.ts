import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

/**
 * GET /api/fdk/ocr-health
 *
 * Health check for Anthropic API (OCR).
 * Returns: { status: "ok" | "no_key" | "error", message, keyLast4 }
 */
export async function GET() {
  await requireAdmin();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      status: "no_key",
      message: "Brak ANTHROPIC_API_KEY w zmiennych środowiskowych.",
      keyLast4: null,
    });
  }

  const keyLast4 = apiKey.slice(-4);

  try {
    // Minimal API call — count tokens (cheapest operation)
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1,
      messages: [{ role: "user", content: "ok" }],
    });

    if (response.id) {
      return NextResponse.json({
        status: "ok",
        message: "API działa poprawnie.",
        keyLast4,
        model: response.model,
      });
    }

    return NextResponse.json({
      status: "error",
      message: "API zwróciło odpowiedź bez ID.",
      keyLast4,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);

    let status = "error";
    let message = errMsg;

    if (/credit.balance|too.low|insufficient/i.test(errMsg)) {
      status = "no_credits";
      message = "Brak środków na koncie API. Doładuj konto Anthropic.";
    } else if (/401|unauthorized|invalid.*key/i.test(errMsg)) {
      status = "bad_key";
      message = "Klucz API jest nieprawidłowy lub wygasł.";
    } else if (/429|rate.limit/i.test(errMsg)) {
      status = "rate_limited";
      message = "Przekroczono limit zapytań API. Spróbuj za chwilę.";
    }

    return NextResponse.json({ status, message, keyLast4 });
  }
}
