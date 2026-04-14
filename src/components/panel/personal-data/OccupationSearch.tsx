"use client";

import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { inputBase } from "./constants";

interface KzisResult {
  kod: string;
  opis: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
}

export function OccupationSearch({ value, onChange, label, placeholder }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<KzisResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/kzis?q=${encodeURIComponent(q)}&limit=15`);
        const data = await res.json();
        setResults(data.results ?? []);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleInput = (val: string) => {
    setQuery(val);
    onChange(val);
    search(val);
  };

  const handleSelect = (item: KzisResult) => {
    const selected = `${item.kod} — ${item.opis}`;
    setQuery(selected);
    onChange(selected);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-primary mb-1.5">
        {label}
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/40" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => query.length >= 2 && results.length > 0 && setIsOpen(true)}
          placeholder={placeholder ?? "Wpisz nazwę lub kod zawodu..."}
          className={`${inputBase} pl-9`}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-primary/15 bg-white shadow-lg">
          {results.map((item) => (
            <li key={item.kod}>
              <button
                type="button"
                onClick={() => handleSelect(item)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface"
              >
                <span className="flex-shrink-0 rounded bg-accent/10 px-1.5 py-0.5 text-xs font-mono font-semibold text-accent">
                  {item.kod}
                </span>
                <span className="text-primary">{item.opis}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {isOpen && results.length === 0 && !isLoading && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-primary/15 bg-white p-3 text-center text-sm text-ink/50 shadow-lg">
          Brak wyników
        </div>
      )}
    </div>
  );
}
