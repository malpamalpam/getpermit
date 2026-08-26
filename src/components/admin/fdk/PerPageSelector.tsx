"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const SIZES = [50, 100, 200] as const;
const STORAGE_KEY = "fdk-perPage";

export function PerPageSelector({
  current,
  buildUrl,
}: {
  current: number;
  buildUrl: (pp: number) => string;
}) {
  const router = useRouter();

  // On mount: if no perPage in URL but localStorage has a preference, redirect
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SIZES.includes(parseInt(saved, 10) as 50 | 100 | 200)) {
      const savedNum = parseInt(saved, 10);
      if (savedNum !== current && !window.location.search.includes("perPage=")) {
        router.replace(buildUrl(savedNum));
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(pp: number) {
    localStorage.setItem(STORAGE_KEY, String(pp));
    router.push(buildUrl(pp));
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-primary/50">Pokaż:</span>
      {SIZES.map((size) => (
        <button
          key={size}
          onClick={() => handleChange(size)}
          className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
            current === size
              ? "bg-accent text-white"
              : "bg-primary/5 text-primary/70 hover:bg-primary/10"
          }`}
        >
          {size}
        </button>
      ))}
    </div>
  );
}
