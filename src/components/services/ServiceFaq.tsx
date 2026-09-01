"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

export function ServiceFaq({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} className="rounded-lg border border-primary/10 bg-white">
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-surface/50"
            >
              <span>{item.question}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-primary/40 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <div
                className="border-t border-primary/5 px-4 py-3 text-sm text-primary/70 prose prose-sm max-w-none prose-a:text-accent prose-a:no-underline hover:prose-a:underline"
                dangerouslySetInnerHTML={{ __html: item.answer }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
