# Zabezpieczenia danych osobowych — getpermit.pl

## 1. Szyfrowanie danych

### At rest (dane w spoczynku)
- **Baza danych PostgreSQL** hostowana na **Supabase EU (Frankfurt, Niemcy)** — szyfrowanie at rest AES-256 na poziomie storage (zarządzane przez Supabase/AWS).
- **Pliki (załączniki)** przechowywane w **Supabase Storage** — szyfrowanie at rest AES-256 (S3-compatible storage z SSE).
- Backup bazy danych jest automatycznie szyfrowany.

### In transit (dane w transmisji)
- Cała komunikacja odbywa się przez **HTTPS/TLS 1.2+** (wymuszany nagłówkiem `Strict-Transport-Security: max-age=63072000`).
- Połączenia do bazy danych PostgreSQL używają SSL (wymagane przez Supabase).
- Połączenia do API Resend (email) przez HTTPS.

## 2. Kontrola dostępu (role)

System implementuje trzy role użytkowników:

| Rola | Uprawnienia |
|------|------------|
| **ADMIN** | Pełny dostęp: CRUD cudzoziemców, dokumentów, ustawień. Dostęp do audit logów. Usuwanie danych. |
| **STAFF** | Odczyt danych cudzoziemców i dokumentów. Tworzenie wydarzeń kalendarza. Brak możliwości usuwania. |
| **CLIENT** | Dostęp wyłącznie do własnych danych (sprawy, dokumenty). Brak dostępu do modułu FDK. |

### Row-Level Security (RLS)
Polityki RLS na poziomie bazy danych zapewniają, że:
- Klienci widzą **wyłącznie** swoje dane (sprawy, dokumenty, wiadomości)
- Dane FDK (cudzoziemcy, podstawy zatrudnienia, kontrakty HR) są dostępne **wyłącznie** dla STAFF/ADMIN
- Audit logi (access_logs, fdk_change_logs) są czytelne **wyłącznie** dla ADMIN
- Ustawienia powiadomień modyfikowalne **wyłącznie** przez ADMIN

### Autentykacja
- **Supabase Auth** z hashowaniem haseł (bcrypt)
- Sesje przez **HTTP-only cookies** (nie localStorage)
- Rate limiting na logowanie (10 prób / 30 min per IP)
- Rate limiting na rejestrację (5 prób / 30 min per IP)

## 3. Audit log (śledzenie dostępu)

### Logi dostępu ogólne (`access_logs`)
Każda akcja w systemie jest logowana:
- VIEW_CASE, VIEW_DOCUMENT, DOWNLOAD_DOCUMENT
- CREATE_CASE, UPDATE_CASE, CREATE_EVENT
- UPLOAD_DOCUMENT, DELETE_CLIENT_DOCUMENT
- VERIFY_DOCUMENT, SEND_MESSAGE

Dane logowane: użytkownik, sprawa, adres IP, user agent, timestamp, metadata JSON.

### Historia zmian profilu cudzoziemca (`fdk_change_logs`)
Każda zmiana danych osobowych cudzoziemca jest logowana z:
- Data i czas zmiany
- Autor zmiany (email użytkownika)
- Zmienione pole
- Wartość przed i po zmianie

### Log powiadomień (`fdk_notification_logs`)
System rejestruje każde wysłane powiadomienie email do cudzoziemca:
- Odbiorca, typ powiadomienia, data wysłania

## 4. Ochrona przed atakami (OWASP)

| Zagrożenie | Zabezpieczenie |
|-----------|---------------|
| XSS | React automatycznie escapuje output; CSP headers |
| CSRF | Supabase cookies z `SameSite=Lax`; Server Actions z walidacją sesji |
| SQL Injection | Prisma ORM (parametryzowane zapytania) |
| Clickjacking | `X-Frame-Options: DENY` |
| MIME Sniffing | `X-Content-Type-Options: nosniff` |
| Referrer leakage | `Referrer-Policy: strict-origin-when-cross-origin` |

## 5. Zgodność z RODO

| Wymóg RODO | Realizacja |
|-----------|-----------|
| **Minimalizacja danych** | Zbieramy tylko dane niezbędne do legalizacji pobytu/pracy |
| **Prawo dostępu** | Klient widzi swoje dane w Panelu Klienta |
| **Prawo do usunięcia** | Admin może usunąć profil cudzoziemca (CASCADE na wszystkie powiązane dane) |
| **Pseudonimizacja** | Cron `anonymize-old-cases` automatycznie anonimizuje stare sprawy |
| **Przechowywanie w UE** | Supabase EU (Frankfurt) — dane nie opuszczają Europejskiego Obszaru Gospodarczego |
| **Rejestr czynności przetwarzania** | Audit log rejestruje każdy dostęp do danych osobowych |
| **Szyfrowanie** | AES-256 at rest, TLS 1.2+ in transit |
| **Kontrola dostępu** | RBAC (Admin/Staff/Client) + RLS na poziomie bazy danych |

## 6. Infrastruktura

```
[Użytkownik] → HTTPS/TLS → [Vercel Edge (EU)] → [Next.js App]
                                                       ↓
                                              [Supabase PostgreSQL EU]
                                              [Supabase Storage EU]
                                                       ↓
                                              [Resend Email API]
```

- **Hosting**: Vercel (Edge Runtime, EU region)
- **Baza danych**: Supabase PostgreSQL (Frankfurt, EU)
- **Storage**: Supabase Storage (Frankfurt, EU)
- **Email**: Resend (US-based, ale dane emaili to minimum niezbędne)
- **DNS/CDN**: Vercel Edge Network

## 7. Kopie zapasowe

- Supabase automatycznie tworzy backup bazy danych co 24h (retencja 7 dni na planie Pro).
- Pliki w Storage są replikowane w ramach AWS S3 (multi-AZ).

---

*Dokument wygenerowany: 2026-04-24*
*System: getpermit.pl — Panel Klienta / CRM legalizacji*
