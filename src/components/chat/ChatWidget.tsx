"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { MessageCircle, X } from "lucide-react";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";
import type { ChatMessage } from "@/lib/chat/types";

const WELCOME_MESSAGES: Record<string, string> = {
  pl: "Cze\u015b\u0107! Jestem asystentem getpermit.pl. W czym mog\u0119 pom\u00f3c?",
  en: "Hi! I'm the getpermit.pl assistant. How can I help you?",
  ru: "\u041f\u0440\u0438\u0432\u0435\u0442! \u042f \u2014 \u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043d\u0442 getpermit.pl. \u0427\u0435\u043c \u043c\u043e\u0433\u0443 \u043f\u043e\u043c\u043e\u0447\u044c?",
  uk: "\u041f\u0440\u0438\u0432\u0456\u0442! \u042f \u2014 \u0430\u0441\u0438\u0441\u0442\u0435\u043d\u0442 getpermit.pl. \u0427\u0438\u043c \u043c\u043e\u0436\u0443 \u0434\u043e\u043f\u043e\u043c\u043e\u0433\u0442\u0438?",
};

const QUICK_REPLIES: Record<string, string[]> = {
  pl: ["Karta pobytu", "Zezwolenie na prac\u0119", "Blue Card", "Ile kosztuje?"],
  en: ["Residence card", "Work permit", "Blue Card", "How much does it cost?"],
  ru: ["\u041a\u0430\u0440\u0442\u0430 \u043f\u043e\u0431\u044b\u0442\u0443", "\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u0435 \u043d\u0430 \u0440\u0430\u0431\u043e\u0442\u0443", "Blue Card", "\u0421\u043a\u043e\u043b\u044c\u043a\u043e \u0441\u0442\u043e\u0438\u0442?"],
  uk: ["\u041a\u0430\u0440\u0442\u0430 \u043f\u043e\u0431\u0443\u0442\u0443", "\u0414\u043e\u0437\u0432\u0456\u043b \u043d\u0430 \u0440\u043e\u0431\u043e\u0442\u0443", "Blue Card", "\u0421\u043a\u0456\u043b\u044c\u043a\u0438 \u043a\u043e\u0448\u0442\u0443\u0454?"],
};

const ONLINE_STATUS: Record<string, string> = {
  pl: "Asystent online",
  en: "Assistant online",
  ru: "\u0410\u0441\u0441\u0438\u0441\u0442\u0435\u043d\u0442 \u043e\u043d\u043b\u0430\u0439\u043d",
  uk: "\u0410\u0441\u0438\u0441\u0442\u0435\u043d\u0442 \u043e\u043d\u043b\u0430\u0439\u043d",
};

const OPEN_LABEL: Record<string, string> = {
  pl: "Otw\u00f3rz czat",
  en: "Open chat",
  ru: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0447\u0430\u0442",
  uk: "\u0412\u0456\u0434\u043a\u0440\u0438\u0442\u0438 \u0447\u0430\u0442",
};

const CLOSE_LABEL: Record<string, string> = {
  pl: "Zamknij czat",
  en: "Close chat",
  ru: "\u0417\u0430\u043a\u0440\u044b\u0442\u044c \u0447\u0430\u0442",
  uk: "\u0417\u0430\u043a\u0440\u0438\u0442\u0438 \u0447\u0430\u0442",
};

const ERROR_MESSAGES: Record<string, string> = {
  pl: "Przepraszam, wyst\u0105pi\u0142 b\u0142\u0105d. Spr\u00f3buj ponownie lub zadzwo\u0144: +48 515 229 783",
  en: "Sorry, an error occurred. Try again or call: +48 515 229 783",
  ru: "\u0418\u0437\u0432\u0438\u043d\u0438\u0442\u0435, \u043f\u0440\u043e\u0438\u0437\u043e\u0448\u043b\u0430 \u043e\u0448\u0438\u0431\u043a\u0430. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0441\u043d\u043e\u0432\u0430 \u0438\u043b\u0438 \u043f\u043e\u0437\u0432\u043e\u043d\u0438\u0442\u0435: +48 515 229 783",
  uk: "\u0412\u0438\u0431\u0430\u0447\u0442\u0435, \u0441\u0442\u0430\u043b\u0430\u0441\u044f \u043f\u043e\u043c\u0438\u043b\u043a\u0430. \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437 \u0430\u0431\u043e \u0437\u0430\u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0443\u0439\u0442\u0435: +48 515 229 783",
};

export function ChatWidget() {
  const locale = useLocale();
  const welcomeMessage: ChatMessage = {
    role: "assistant",
    content: WELCOME_MESSAGES[locale] ?? WELCOME_MESSAGES.pl,
  };
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (isLoading) return;

      setShowQuickReplies(false);
      const userMsg: ChatMessage = { role: "user", content: text };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setIsLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages.filter((m) => m !== welcomeMessage),
            locale,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error("[chat] API error:", err);
          throw new Error(err.detail ?? err.error ?? "B\u0142\u0105d serwera");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let assistantText = "";

        // Add empty assistant message
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                assistantText += parsed.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantText,
                  };
                  return updated;
                });
              }
            } catch {
              // skip invalid JSON
            }
          }
        }
      } catch (err) {
        const detail = err instanceof Error ? err.message : "";
        console.error("[chat] send error:", detail);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              (ERROR_MESSAGES[locale] ?? ERROR_MESSAGES.pl) +
              (detail ? `\n\n[Debug: ${detail}]` : ""),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading]
  );

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-transform hover:scale-105 hover:shadow-xl"
          aria-label={OPEN_LABEL[locale] ?? OPEN_LABEL.pl}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-4 right-4 z-[9999] flex w-[380px] flex-col overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-2xl max-[480px]:inset-0 max-[480px]:w-full max-[480px]:rounded-none animate-[scaleIn_0.2s_ease-out]">
          {/* Header */}
          <div className="flex items-center justify-between bg-primary px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <MessageCircle className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  getpermit.pl
                </div>
                <div className="text-[10px] text-white/60">{ONLINE_STATUS[locale] ?? ONLINE_STATUS.pl}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label={CLOSE_LABEL[locale] ?? CLOSE_LABEL.pl}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
            style={{ height: "400px", maxHeight: "60vh" }}
          >
            {messages.map((msg, i) => (
              <ChatBubble key={i} role={msg.role} content={msg.content} />
            ))}

            {/* Quick replies */}
            {showQuickReplies && (
              <div className="flex flex-wrap gap-2 pt-1">
                {(QUICK_REPLIES[locale] ?? QUICK_REPLIES.pl).map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => sendMessage(text)}
                    className="rounded-full border border-accent/40 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}

            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-surface px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary/30" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary/30" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary/30" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <ChatInput onSend={sendMessage} disabled={isLoading} />
        </div>
      )}
    </>
  );
}
