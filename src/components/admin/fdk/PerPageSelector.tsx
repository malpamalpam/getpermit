"use client";

import { useEffect } from "react";

const SIZES = [50, 100, 200] as const;
const STORAGE_KEY = "fdk-perPage";

export function PerPageSelector({
  current,
  urls,
}: {
  current: number;
  urls: Record<number, string>;
}) {
  // On mount: if localStorage has a preference different from current, redirect
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SIZES.includes(parseInt(saved, 10) as 50 | 100 | 200)) {
      const savedNum = parseInt(saved, 10);
      if (savedNum !== current && urls[savedNum]) {
        window.location.href = urls[savedNum];
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-primary/50">Pokaż:</span>
      {SIZES.map((size) => (
        <a
          key={size}
          href={urls[size]}
          onClick={() => localStorage.setItem(STORAGE_KEY, String(size))}
          className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
            current === size
              ? "bg-accent text-white"
              : "bg-primary/5 text-primary/70 hover:bg-primary/10"
          }`}
        >
          {size}
        </a>
      ))}
    </div>
  );
}
