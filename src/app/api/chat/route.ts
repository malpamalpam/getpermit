import { type NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/chat/system-prompt";
import type { ChatRequest } from "@/lib/chat/types";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  buildKnowledgeBase,
  searchKnowledge,
  buildContextSnippet,
} from "@/lib/chat/knowledge";

export const runtime = "nodejs";
export const maxDuration = 60;

const RATE_LIMIT_CONFIG = { maxRequests: 20, windowSeconds: 60 };
const MAX_MESSAGES = 10;

/** Wykryj locale z Content-Language lub body, fallback pl */
function detectLocale(body: ChatRequest & { locale?: string }): string {
  const loc = body.locale;
  if (loc === "pl" || loc === "en" || loc === "ru" || loc === "uk") return loc;
  return "pl";
}

export async function POST(request: NextRequest) {
  console.log("[chat] POST received");
  console.log("[chat] API key present:", !!process.env.ANTHROPIC_API_KEY);
  console.log("[chat] API key length:", process.env.ANTHROPIC_API_KEY?.length ?? 0);

  // Rate limiting
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const rl = checkRateLimit(`chat:${ip}`, RATE_LIMIT_CONFIG);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Zbyt wiele wiadomości. Spróbuj za chwilę." },
      { status: 429 }
    );
  }

  // Parse body
  let body: ChatRequest & { locale?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "No messages" }, { status: 400 });
  }

  // Limit history
  const messages = body.messages.slice(-MAX_MESSAGES).map((m) => ({
    role: m.role as "user" | "assistant",
    content: String(m.content).slice(0, 2000),
  }));

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[chat] ANTHROPIC_API_KEY missing");
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 }
    );
  }

  try {
    const locale = detectLocale(body);

    // RAG: znajdź relevantne fragmenty wiedzy (try-catch bo może failować)
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    let contextSnippet = "";
    try {
      if (lastUserMsg) {
        const kb = buildKnowledgeBase(locale);
        console.log("[chat] KB size:", kb.length);
        const relevantChunks = searchKnowledge(lastUserMsg.content, kb, 3);
        console.log("[chat] relevant chunks:", relevantChunks.length);
        contextSnippet = buildContextSnippet(relevantChunks);
      }
    } catch (kbErr) {
      console.error("[chat] KB error:", kbErr);
      // Kontynuuj bez RAG
    }

    const fullSystemPrompt = SYSTEM_PROMPT + contextSnippet;

    const client = new Anthropic({ apiKey });
    console.log("[chat] calling Anthropic API, messages:", messages.length);

    const stream = await client.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: fullSystemPrompt,
      messages,
    });

    // Convert to ReadableStream for SSE
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const data = JSON.stringify({ text: event.delta.text });
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("[chat] stream error:", err);
          try {
            controller.error(err);
          } catch {
            // ignore
          }
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[chat] API error:", message);
    if (stack) console.error(stack);
    return NextResponse.json(
      {
        error: "Przepraszam, wystąpił błąd. Spróbuj ponownie.",
        detail: message,
      },
      { status: 500 }
    );
  }
}
