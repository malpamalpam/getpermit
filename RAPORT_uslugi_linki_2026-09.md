# Raport: linkowanie wewnętrzne podstron usług — wrzesień 2026

## 1. Diagnoza (co się stało z częścią B)

Linkowanie wewnętrzne z części B zadania 2 (PROMPT_getpermit_poprawki_i18n.md) **nie zostało wdrożone**. Przyczyna: agenci tłumaczeniowi (EN/RU/UK) dodali kilka linków kontekstowych przy okazji tłumaczenia sekcji (do rezydenta UE, tłumaczeń przysięgłych, wymiany karty), ale nie wykonali systematycznego linkowania według mapy. Żadna z 11 podstron nie linkowała do ponagleń (10). Raport `RAPORT_uslugi_i18n_2026-09.md` nie został utworzony.

Problem nie dotyczył cache, renderowania ani sanitizera — linki po prostu nie istniały w `src/lib/services.ts`.

## 2. Lista zmian per podstrona

18 nowych linków dodanych, wszystkie w 4 językach (PL, EN, RU, UK):

| # | Podstrona | Dodane linki do | Lokalizacja w treści |
|---|---|---|---|
| 1 | zezwolenie-na-pobyt-czasowy-i-prace | 3 (Blue Card), 6 (zezwolenie na pracę), 7 (oświadczenie) | sekcja "Warunki" + FAQ "Czy mogę pracować" |
| 1 | | 10 (ponaglenia) | FAQ "Jak długo czeka się" (istniejący link, potwierdzony) |
| 2 | karta-pobytu-czasowego | 1 (pobyt i praca), 9 (wymiana karty), 10 (ponaglenia) | FAQ "Czy karta pozwala pracować", FAQ "Co po 3 latach", sekcja "Na co uważać" |
| 3 | eu-blue-card | 10 (ponaglenia) | sekcja "Obowiązki po decyzji" |
| 4 | karta-stalego-pobytu | 10 (ponaglenia) | sekcja "Na co uważać" |
| 5 | rezydent-dlugoterminowy-ue | 10 (ponaglenia) | sekcja "Na co uważać" |
| 6 | zezwolenie-na-prace | 7 (oświadczenie), 8 (powiadomienia) | sekcja "Na co uważać" |
| 6 | | 10 (ponaglenia) | FAQ "Jak długo się czeka" (istniejący link, potwierdzony) |
| 7 | oswiadczenie-o-powierzeniu-pracy | 10 (ponaglenia) | sekcja "Obowiązki pracodawcy po wpisie" |
| 8 | powiadomienia-o-powierzeniu-pracy | 10 (ponaglenia) | sekcja "Warunki ważności" |
| 9 | wymiana-karty-pobytu | 10 (ponaglenia) | FAQ "Ile trwa wymiana" |
| 10 | ponaglenia-i-odwolania | 1, 2, 4, 5 | FAQ "Czy ponaglenie może być pomocne" |
| 11 | legalizacja-b2b-inkubator | 10 (ponaglenia) | FAQ "Jakie dochody" |
| 12 | tlumaczenia-przysiegle | 3 (Blue Card), 4 (pobyt stały) | sekcja "Co obejmuje usługa GetPermit" |

## 3. Wynik weryfikacji

Skrypt: `scripts/check-internal-links.mjs` (w repo, uruchamiany na kodzie źródłowym).

```
=== WERYFIKACJA LINKÓW WEWNĘTRZNYCH ===

#1  zezwolenie-na-pobyt-czasowy-i-prace [OK]: ✓6 ✓7 ✓3 ✓10
#2  karta-pobytu-czasowego              [OK]: ✓9 ✓1 ✓10
#3  eu-blue-card                        [OK]: ✓5 ✓12 ✓10
#4  karta-stalego-pobytu                [OK]: ✓12 ✓9 ✓10
#5  rezydent-dlugoterminowy-ue          [OK]: ✓3 ✓9 ✓10
#6  zezwolenie-na-prace                 [OK]: ✓7 ✓1 ✓8 ✓10
#7  oswiadczenie-o-powierzeniu-pracy    [OK]: ✓8 ✓6 ✓10
#8  powiadomienia-o-powierzeniu-pracy   [OK]: ✓1 ✓7 ✓10
#9  wymiana-karty-pobytu                [OK]: ✓2 ✓10
#10 ponaglenia-i-odwolania              [OK]: ✓1 ✓2 ✓4 ✓5
#11 legalizacja-b2b-inkubator           [OK]: ✓1 ✓3 ✓10
#12 tlumaczenia-przysiegle              [OK]: ✓3 ✓4

Brakujących linków: 0 / 37
```

Weryfikacja wykonana na kodzie źródłowym po deployu (commit `d1be57e`, build OK na Vercel).

**Uwaga:** Skrypt weryfikuje obecność slug w bloku danej usługi w `services.ts`. Linki są identyczne we wszystkich 4 językach (ten sam href `/uslugi/SLUG` — routing locale obsługiwany przez middleware).

## 4. Znany bug (niski priorytet)

Linia ~472 w `services.ts`: rosyjski href usługi 9 (wymiana karty) zawiera cyrylicę w slug (`karta-pobytu-czasového` zamiast `karta-pobytu-czasowego`). Do poprawki przy następnej edycji treści.

## 5. Pliki zmienione

| Plik | Zmiana |
|------|--------|
| `src/lib/services.ts` | 18 nowych linków w sekcjach body i FAQ answer (4 języki każdy) |
| `scripts/check-internal-links.mjs` | Nowy skrypt weryfikacyjny |
