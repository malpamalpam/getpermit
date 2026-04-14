"use client";

import { useState, useEffect, useRef } from "react";
import { inputBase } from "./constants";

const COUNTRIES = [
  "Afganistan","Albania","Algieria","Andora","Angola","Antigua i Barbuda","Arabia Saudyjska",
  "Argentyna","Armenia","Australia","Austria","Azerbejdżan","Bahamy","Bahrajn","Bangladesz",
  "Barbados","Belgia","Belize","Benin","Bhutan","Białoruś","Boliwia","Bośnia i Hercegowina",
  "Botswana","Brazylia","Brunei","Bułgaria","Burkina Faso","Burundi","Chile","Chiny","Chorwacja",
  "Cypr","Czad","Czarnogóra","Czechy","Dania","Demokratyczna Republika Konga","Dominika",
  "Dominikana","Dżibuti","Egipt","Ekwador","Erytrea","Estonia","Eswatini","Etiopia","Fidżi",
  "Filipiny","Finlandia","Francja","Gabon","Gambia","Ghana","Grecja","Grenada","Gruzja",
  "Gujana","Gwatemala","Gwinea","Gwinea Bissau","Haiti","Hiszpania","Holandia","Honduras",
  "Indie","Indonezja","Irak","Iran","Irlandia","Islandia","Izrael","Jamajka","Japonia","Jemen",
  "Jordania","Kambodża","Kamerun","Kanada","Katar","Kazachstan","Kenia","Kirgistan","Kiribati",
  "Kolumbia","Komory","Kongo","Korea Południowa","Korea Północna","Kostaryka","Kuba","Kuwejt",
  "Laos","Lesotho","Liban","Liberia","Libia","Liechtenstein","Litwa","Luksemburg","Łotwa",
  "Macedonia Północna","Madagaskar","Malawi","Malediwy","Malezja","Mali","Malta","Maroko",
  "Mauretania","Mauritius","Meksyk","Mikronezja","Mjanma","Mołdawia","Monako","Mongolia",
  "Mozambik","Namibia","Nauru","Nepal","Niemcy","Niger","Nigeria","Nikaragua","Norwegia",
  "Nowa Zelandia","Oman","Pakistan","Palau","Panama","Papua-Nowa Gwinea","Paragwaj","Peru",
  "Polska","Portugalia","Republika Południowej Afryki","Republika Środkowoafrykańska",
  "Rosja","Rumunia","Rwanda","Saint Kitts i Nevis","Saint Lucia","Saint Vincent i Grenadyny",
  "Salwador","Samoa","San Marino","Senegal","Serbia","Seszele","Sierra Leone","Singapur",
  "Słowacja","Słowenia","Somalia","Sri Lanka","Stany Zjednoczone","Sudan","Sudan Południowy",
  "Surinam","Syria","Szwajcaria","Szwecja","Tadżykistan","Tajlandia","Tanzania","Timor Wschodni",
  "Togo","Tonga","Trynidad i Tobago","Tunezja","Turcja","Turkmenistan","Tuvalu","Uganda",
  "Ukraina","Urugwaj","Uzbekistan","Vanuatu","Watykan","Wenezuela","Węgry","Wielka Brytania",
  "Wietnam","Włochy","Wybrzeże Kości Słoniowej","Wyspy Marshalla","Wyspy Salomona",
  "Zambia","Zimbabwe","Zjednoczone Emiraty Arabskie",
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  label: string;
  required?: boolean;
}

export function CountrySearch({ value, onChange, label, required }: Props) {
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
    if (val.length >= 1) {
      const lower = val.toLowerCase();
      setResults(COUNTRIES.filter((c) => c.toLowerCase().includes(lower)).slice(0, 10));
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (country: string) => {
    setQuery(country);
    onChange(country);
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
        onFocus={() => query.length >= 1 && results.length > 0 && setIsOpen(true)}
        className={inputBase}
      />
      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-primary/15 bg-white shadow-lg">
          {results.map((country) => (
            <li key={country}>
              <button
                type="button"
                onClick={() => handleSelect(country)}
                className="w-full px-3 py-2 text-left text-sm text-primary transition-colors hover:bg-surface"
              >
                {country}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
