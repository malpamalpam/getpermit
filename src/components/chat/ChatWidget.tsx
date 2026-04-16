"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { MessageCircle, X } from "lucide-react";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";
import type { ChatMessage } from "@/lib/chat/types";

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "Cze\u015b\u0107! Jestem asystentem getpermit.pl. W czym mog\u0119 pom\u00f3c? \ud83c\uddf5\ud83c\uddf1\ud83c\uddec\ud83c\udde7\ud83c\uddf7\ud83c\uddfa\ud83c\uddfa\ud83c\udde6",
};

const QUICK_REPLIES = [
  "Karta pobytu",
  "Work permit",
  "\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u0435 \u043d\u0430 \u0440\u0430\u0431\u043e\u0442\u0443",
  "Blue Card",
];

export function ChatWidget() {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
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
            messages: newMessages.filter((m) => m !== WELCOME_MESSAGE),
            locale,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "B\u0142\u0105d serwera");
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
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Przepraszam, wyst\u0105pi\u0142 b\u0142\u0105d. Spr\u00f3buj ponownie lub zadzwo\u0144: +48 515 229 783",
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
          aria-label="Otw\u00f3rz czat"
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
                <div className="text-[10px] text-white/60">Asystent online</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Zamknij czat"
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
                {QUICK_REPLIES.map((text) => (
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
