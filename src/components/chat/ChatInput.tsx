"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Send } from "lucide-react";

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
}

const PLACEHOLDERS: Record<string, string> = {
  pl: "Napisz wiadomo\u015b\u0107...",
  en: "Type a message...",
  ru: "\u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435...",
  uk: "\u041d\u0430\u043f\u0438\u0448\u0456\u0442\u044c \u043f\u043e\u0432\u0456\u0434\u043e\u043c\u043b\u0435\u043d\u043d\u044f...",
};

const SEND_LABELS: Record<string, string> = {
  pl: "Wy\u015blij",
  en: "Send",
  ru: "\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c",
  uk: "\u041d\u0430\u0434\u0456\u0441\u043b\u0430\u0442\u0438",
};

export function ChatInput({ onSend, disabled }: Props) {
  const locale = useLocale();
  const [text, setText] = useState("");

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <div className="flex items-center gap-2 border-t border-primary/10 bg-white p-3">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 500))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder={PLACEHOLDERS[locale] ?? PLACEHOLDERS.pl}
        disabled={disabled}
        className="flex-1 rounded-lg border border-primary/15 bg-white px-3 py-2 text-sm text-primary placeholder:text-primary/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent text-white transition-colors hover:bg-accent/90 disabled:opacity-40"
        aria-label={SEND_LABELS[locale] ?? SEND_LABELS.pl}
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}
