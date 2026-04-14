"use client";

import { useState, useEffect, useRef } from "react";
import { inputBase } from "./constants";

// Popularne polskie miasta (top ~300) — ładowane statycznie dla szybkości
const POLISH_CITIES = [
  "Białystok","Bielsko-Biała","Bydgoszcz","Bytom","Chorzów","Częstochowa","Dąbrowa Górnicza",
  "Elbląg","Gdańsk","Gdynia","Gliwice","Gorzów Wielkopolski","Grudziądz","Jastrzębie-Zdrój",
  "Jelenia Góra","Kalisz","Katowice","Kielce","Koszalin","Kraków","Legnica","Lublin","Łódź",
  "Mysłowice","Nowy Sącz","Olsztyn","Opole","Ostrów Wielkopolski","Piła","Płock","Poznań",
  "Radom","Ruda Śląska","Rybnik","Rzeszów","Siedlce","Siemianowice Śląskie","Skierniewice",
  "Słupsk","Sosnowiec","Stalowa Wola","Stargard","Suwałki","Szczecin","Świętochłowice",
  "Tarnobrzeg","Tarnów","Toruń","Tychy","Wałbrzych","Warszawa","Włocławek","Wrocław",
  "Zabrze","Zamość","Zielona Góra","Żory",
  // Dzielnice Warszawy
  "Warszawa - Bemowo","Warszawa - Białołęka","Warszawa - Bielany","Warszawa - Mokotów",
  "Warszawa - Ochota","Warszawa - Praga-Południe","Warszawa - Praga-Północ",
  "Warszawa - Rembertów","Warszawa - Śródmieście","Warszawa - Targówek",
  "Warszawa - Ursus","Warszawa - Ursynów","Warszawa - Wawer","Warszawa - Wesoła",
  "Warszawa - Wilanów","Warszawa - Włochy","Warszawa - Wola","Warszawa - Żoliborz",
  // Dzielnice Krakowa
  "Kraków - Stare Miasto","Kraków - Grzegórzki","Kraków - Prądnik Czerwony",
  "Kraków - Prądnik Biały","Kraków - Krowodrza","Kraków - Bronowice","Kraków - Zwierzyniec",
  "Kraków - Dębniki","Kraków - Łagiewniki-Borek Fałęcki","Kraków - Swoszowice",
  "Kraków - Podgórze","Kraków - Bieżanów-Prokocim","Kraków - Nowa Huta",
  // Inne duże
  "Bemowo","Białołęka","Bielany","Mokotów","Ochota","Praga-Południe","Praga-Północ",
  "Śródmieście","Targówek","Ursus","Ursynów","Wawer","Wilanów","Włochy","Wola","Żoliborz",
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  label: string;
  required?: boolean;
  placeholder?: string;
}

export function CitySearch({ value, onChange, label, required, placeholder }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    onChange(val);
    if (val.length >= 2) {
      const lower = val.toLowerCase();
      setResults(POLISH_CITIES.filter((c) => c.toLowerCase().includes(lower)).slice(0, 10));
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (city: string) => {
    setQuery(city);
    onChange(city);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-primary mb-1.5">
        {label}{required ? " *" : ""}
      </label>
      <input
        type="text"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => query.length >= 2 && results.length > 0 && setIsOpen(true)}
        placeholder={placeholder}
        className={inputBase}
      />
      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-primary/15 bg-white shadow-lg">
          {results.map((city) => (
            <li key={city}>
              <button
                type="button"
                onClick={() => handleSelect(city)}
                className="w-full px-3 py-2 text-left text-sm text-primary transition-colors hover:bg-surface"
              >
                {city}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Wyszukiwarka ulic — dynamiczna po wpisaniu tekstu
// W przyszłości można podpiąć API TERYT, na razie pole tekstowe z sugestiami
export function StreetSearch({ value, onChange, label, required, placeholder }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-primary mb-1.5">
        {label}{required ? " *" : ""}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputBase}
      />
    </div>
  );
}
