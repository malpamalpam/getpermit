# Dokumenty działu legalizacji — źródła reguł

Ten folder zawiera dokumenty referencyjne, na podstawie których zbudowano plik konfiguracyjny `config/legalizacja-rules.yaml` i moduł `src/lib/legalizacja-config.ts`.

## Dokumenty źródłowe

1. **Reguły mapowania dokumentów do CRM** (stan prawny: październik 2026)
   - Rozstrzygają nazwy typów i mapowanie dokument → zakładka.
   - Priorytet przy sprzeczności z Instrukcją 1.2.

2. **Instrukcja "Zescrapuj dane" 1.2 — PROJEKT** (02.10.2026)
   - Rozstrzyga procedurę odczytu (skąd brać dane, tożsamość, klucze, statusy, kontrola przed zapisem).
   - Wiersze oznaczone ★ są niezatwierdzone.

3. **Słownik nazw legalizacyjnych — skróty plików**
   - Skróty w nazwach plików (TRC FDK, KP, WP, OŚW...).

## Priorytet przy sprzeczności

Reguły mapowania > Instrukcja 1.2

Wszystkie punkty sporne (13 rozbieżności) zaimplementowane jako przełączniki w konfiguracji (`przelaczniki` w `legalizacja-config.ts`), domyślnie wg Reguł mapowania.

## Pliki konfiguracyjne

- `config/legalizacja-rules.yaml` — plik YAML z regułami (dokumentacja)
- `src/lib/legalizacja-config.ts` — moduł TypeScript z regułami (runtime)
- `src/lib/document-classifier.ts` — klasyfikator dokumentów (v2)
- `src/lib/pre-write-checks.ts` — kontrola przed zapisem (sekcja 7)
