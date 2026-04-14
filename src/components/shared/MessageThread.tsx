"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import type { Role } from "@prisma/client";

interface MessageSender {
  id: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
}

export interface MessageItem {
  id: string;
  body: string;
  createdAt: Date;
  sender: MessageSender;
}

interface Props {
  messages: MessageItem[];
  currentUserId: string;
  onSend: (body: string) => Promise<{ ok: boolean }>;
  namespace?: string;
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function senderName(sender: MessageSender, isMe: boolean, youLabel: string) {
  if (isMe) return youLabel;
  const name =
    `${sender.firstName ?? ""} ${sender.lastName ?? ""}`.trim();
  return name || "—";
}

export function MessageThread({
  messages,
  currentUserId,
  onSend,
  namespace = "panel.case",
}: Props) {
  const t = useTranslations(namespace);
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll na dół po nowych wiadomościach
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Polling co 30s
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 30_000);
    return () => clearInterval(interval);
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || isPending) return;
    startTransition(async () => {
      const result = await onSend(body.trim());
      if (result.ok) {
        setBody("");
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col rounded-xl border border-primary/10 bg-white">
      {/* Messages list */}
      <div
        ref={scrollRef}
        className="flex flex-col gap-3 overflow-y-auto p-4"
        style={{ maxHeight: "400px", minHeight: "200px" }}
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink/50">
            {t("noMessages")}
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender.id === currentUserId;
            const isStaff =
              msg.sender.role === "STAFF" || msg.sender.role === "ADMIN";
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    isMe
                      ? "bg-accent text-white"
                      : isStaff
                        ? "bg-blue-50 text-primary"
                        : "bg-surface text-primary"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider opacity-70">
                    <span>{senderName(msg.sender, isMe, t("you"))}</span>
                    <span>·</span>
                    <time>{formatDateTime(msg.createdAt)}</time>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.body}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-primary/10 p-3"
      >
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("messagePlaceholder")}
          className="flex-1 rounded-lg border border-primary/15 bg-white px-3 py-2 text-sm text-primary placeholder:text-primary/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          disabled={isPending}
        />
        <button
          type="submit"
          disabled={isPending || !body.trim()}
          className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          aria-label={t("sendButton")}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
