# GA4 + Google Search Console — instrukcja konfiguracji

## Stan obecny

- **GTM (Google Tag Manager)** jest zainstalowany na wszystkich stronach publicznych: `GTM-WKPJ99HK`
- GTM jest w `src/app/[locale]/layout.tsx` — NIE ładuje się na `/admin` ani `/panel`
- GA4 measurement ID **nie jest jeszcze skonfigurowany** w GTM

---

## Krok 1: Utwórz property GA4

1. Wejdź na https://analytics.google.com
2. Admin (lewy dolny róg) → **Create Property**
3. Nazwa: `getpermit.pl`, strefa: `Europe/Warsaw`, waluta: `PLN`
4. Platforma: **Web** → URL: `https://getpermit.pl`, Stream name: `getpermit.pl`
5. Skopiuj **Measurement ID** (format: `G-XXXXXXXXXX`)

## Krok 2: Dodaj GA4 tag w GTM

1. Wejdź na https://tagmanager.google.com → workspace `GTM-WKPJ99HK`
2. **Tags → New**:
   - Typ: **Google Analytics: GA4 Configuration**
   - Measurement ID: wklej `G-XXXXXXXXXX` z kroku 1
   - Trigger: **All Pages**
   - Nazwa tagu: `GA4 - getpermit.pl`
3. **Submit** (publikuj kontener)

### Zdarzenia (opcjonalne, do konfiguracji później):
- `contact_form_submit` — po wysłaniu formularza kontaktowego
- `consultation_click` — kliknięcie "Umów konsultację"
- `phone_click` — kliknięcie numeru telefonu
- `whatsapp_click` — kliknięcie WhatsApp

## Krok 3: Zweryfikuj domenę w Google Search Console

1. Wejdź na https://search.google.com/search-console
2. **Add property** → typ: **URL prefix** → `https://getpermit.pl`
3. Metoda weryfikacji: **HTML tag** (najłatwiejsza z Vercel):
   - Skopiuj meta tag: `<meta name="google-site-verification" content="XXXXX" />`
   - Dodaj w `src/app/[locale]/layout.tsx` wewnątrz `<head>`:
     ```tsx
     <meta name="google-site-verification" content="WKLEJ_TUTAJ" />
     ```
   - Alternatywnie: **DNS TXT record** — dodaj TXT record w panelu domeny
4. Kliknij **Verify**

## Krok 4: Zgłoś sitemapę w GSC

1. W Google Search Console → **Sitemaps** (lewe menu)
2. Dodaj URL: `https://getpermit.pl/sitemap.xml`
3. Kliknij **Submit**

## Krok 5: Nadaj dostępy audytorowi (barabaszj@gmail.com)

### GA4:
1. https://analytics.google.com → Admin → Property → **Property Access Management**
2. Kliknij **+** → **Add users**
3. Email: `barabaszj@gmail.com`
4. Rola: **Analyst** (odczyt + tworzenie raportów, bez edycji)
5. Zaznacz **Notify new users by email**
6. Kliknij **Add**

### Google Search Console:
1. https://search.google.com/search-console → **Settings** → **Users and permissions**
2. Kliknij **Add user**
3. Email: `barabaszj@gmail.com`
4. Permission: **Full** (pozwala na inspektowanie URL-i i czytanie raportów)
5. Kliknij **Add**

---

## Notatki

- GTM jest na WSZYSTKICH stronach publicznych (strona główna, usługi, blog, kontakt)
- GTM NIE ładuje się na `/admin/*` ani `/panel/*` (chronione strefy)
- Po skonfigurowaniu GA4 w GTM, dane zaczną się zbierać natychmiast
- Pełna historia danych będzie dostępna dopiero od momentu konfiguracji
