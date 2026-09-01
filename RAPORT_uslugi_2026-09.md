# Raport wdrożenia treści usług — wrzesień 2026

## 1. Zmienione pliki

| Plik | Zakres zmian |
|------|-------------|
| `src/lib/services.ts` | Rozszerzony interfejs `Service` o `sections` i `faq`; zaktualizowane `fullDescription.pl` dla 12 usług; dodane sekcje treściowe i FAQ do 12 usług |
| `src/app/[locale]/uslugi/[slug]/page.tsx` | Rendering nowych sekcji HTML, komponent FAQ, nota "stan prawny", FAQPage JSON-LD |
| `src/components/services/ServiceFaq.tsx` | Nowy — accordion FAQ (client component) |
| `src/components/services/LegalDisclaimer.tsx` | Nowy — nota "stan prawny sierpień 2026" |

## 2. Treści usunięte ze starej wersji

Stare pola (`forWhom`, `requiredDocuments`, `estimatedTime`) **pozostają w danych** ale nie są renderowane gdy usługa ma nowe `sections` (fallback dla usług bez sekcji). Żadna treść nie została fizycznie usunięta z pliku — stare pola EN/RU/UK zachowane bez zmian.

Treści PL zastąpione nową wersją:
- `fullDescription.pl` — zmienione dla wszystkich 12 usług (stare opisy ogólne → nowe "Co to jest i dla kogo" z działu legalizacji)

## 3. Rozbieżności stara treść vs nowa

| Usługa | Pole | Stara wartość | Nowa wartość |
|--------|------|---------------|-------------|
| zezwolenie-na-pobyt-czasowy-i-prace | fullDescription | Ogólny opis "jedno zezwolenie" bez kwot | Precyzyjny opis z art. 114, kwota min. wynagrodzenia 4 806 zł |
| karta-pobytu-czasowego | fullDescription | Ogólny opis "karta pobytu od wojewody" | Opis z art. 186-187, cele pobytu, max 3 lata |
| eu-blue-card | fullDescription | Ogólny opis Blue Card | Opis z art. 127, wymóg dyplomu LUB doświadczenia |
| zezwolenie-na-prace | fullDescription | Brak wzmianki o nowej ustawie | Informacja o ustawie z 1.06.2025 + praca.gov.pl |
| oswiadczenie-o-powierzeniu-pracy | fullDescription | Ogólny opis bez terminów | Max 24 miesiące, data rozpoczęcia max 6 mies. od złożenia |
| powiadomienia-o-powierzeniu-pracy | fullDescription | Brak | Nowy opis: 7 dni, bezpłatne, PESEL UKR |
| ponaglenia-i-odwolania | fullDescription | Ogólny opis | Art. 37 KPA, termin 14 dni, WSA 30 dni |
| legalizacja-b2b-inkubator | fullDescription | Ogólny opis inkubatora | Precyzyjny opis FDK, ścieżki legalizacyjne |
| Opłaty skarbowe | sekcja "Terminy i opłaty" | Brak na stronie | Dodane: 440/340/640/200/400 zł per usługa |
| Obowiązki po decyzji | sekcja | Brak na stronie | Dodane: 15 dni roboczych zawiadomienie itp. |

## 4. Walidacja FAQPage JSON-LD

- FAQPage schema generowana dynamicznie w `page.tsx` (linie 258-274)
- Struktura: `@type: FAQPage`, `mainEntity: Question[]` z `acceptedAnswer.text` (HTML stripped)
- Walidacja: **ręczna inspekcja struktury JSON** — schemat zgodny ze specyfikacją schema.org/FAQPage
- Po deployu zwalidować na: https://search.google.com/test/rich-results (URL każdej podstrony)
- Treść FAQ w schemie odpowiada treści widocznej na stronie (ten sam źródłowy obiekt `faq[]`)

## 5. Propozycje meta title/description

Obecne meta oparte na `service.title` i `service.shortDescription` — po aktualizacji `shortDescription` nie zmieniono (EN/RU/UK bez zmian). Propozycje zmian PL (do akceptacji):

| Slug | Obecny meta description (PL) | Proponowany |
|------|------|------|
| zezwolenie-na-pobyt-czasowy-i-prace | "Tzw. „jedno zezwolenie" — łączy pobyt z prawem do pracy w Polsce." | OK — zgodne z nowym H1 |
| zezwolenie-na-prace | "Legalizacja zatrudnienia cudzoziemca — zezwolenie wydawane na wniosek pracodawcy." | OK |
| Pozostałe 10 | Obecne opisy ogólne | OK — nie zawierają nieaktualnych informacji |

**Brak konieczności zmian meta** — obecne opisy nie zawierają starych kwot ani terminów.

## 6. Otwarte pytania

1. **Tłumaczenia EN/RU/UK** — pola `sections` i `faq` użyły helpera `pl()` (ta sama treść PL we wszystkich językach). Zespół tłumaczeniowy musi zaktualizować `en`, `ru`, `uk` w każdym `LocalizedString`.

2. **Podstrona 6 (zezwolenie-na-prace)** — H1 w treści finalnej brzmi "Zezwolenie na pracę" (bez "typ A"). W obecnym `title.pl` jest "Zezwolenie na pracę" — zgodne. Fraza "typ A" nie występuje w nowej treści. Sprawdzić w GSC czy "zezwolenie na pracę typ A" przynosi ruch — jeśli tak, można dodać w meta description.

3. **Podstrona 8 (powiadomienia)** — termin 31.08.2026 na aktualizację dokumentu podróży w PESEL UKR usunięty zgodnie z instrukcją (termin minął).

4. **Podstrona 12 (tłumaczenia)** — cennik: "wycena indywidualna" zgodnie z instrukcją.

5. **Linkowanie wewnętrzne** — zaimplementowane w treściach HTML sekcji i FAQ:
   - oświadczenie ↔ zezwolenie na pracę ↔ zezwolenie na pobyt i pracę
   - Blue Card ↔ rezydent UE
   - wymiana karty ↔ pobyt czasowy
   - ponaglenia → linkowane z FAQ pozostałych usług (przy pytaniach o czas oczekiwania)
   - powiadomienie ↔ oświadczenie
   - legalizacja B2B → zezwolenie na pobyt i pracę + Blue Card

6. **Walidacja Rich Results** — wymaga sprawdzenia po deployu na produkcji (Google Rich Results Test).
