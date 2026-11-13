# Migracja przechowywania danych osobowych na serwer dhosting.pl

## 1. Architektura docelowa

```
                   Internet
                      |
              +-------+-------+
              |               |
         Vercel (fra1)    dhosting VPS (PL)
         Next.js app      +------------------+
         API routes       | MinIO (S3-compat) |
              |           | port 9000 (API)   |
              +---------->| port 9001 (UI)    |
              | HTTPS     | TLS, SSE, wersj.  |
              |           +------------------+
              |           | opcja B:          |
              +---------->| PostgreSQL 16     |
                          | port 5432         |
                          +------------------+
                          | Firewall:         |
                          | 9000 tylko Vercel  |
                          | 5432 tylko Vercel  |
                          +------------------+
```

## 2. Warstwa storage — adapter wymienialny

### 2.1 Interfejs adaptera

```typescript
// src/lib/storage/types.ts
export interface StorageAdapter {
  upload(bucket: string, path: string, data: Buffer, options?: {
    contentType?: string;
    metadata?: Record<string, string>;
  }): Promise<{ error: Error | null }>;

  download(bucket: string, path: string): Promise<{
    data: Blob | null;
    error: Error | null;
  }>;

  remove(bucket: string, paths: string[]): Promise<{
    error: Error | null;
  }>;

  createSignedUrl(bucket: string, path: string, expiresIn: number, options?: {
    download?: boolean | string;
  }): Promise<{
    data: { signedUrl: string } | null;
    error: Error | null;
  }>;

  createSignedUploadUrl(bucket: string, path: string): Promise<{
    data: { signedUrl: string; path: string; token: string } | null;
    error: Error | null;
  }>;
}
```

### 2.2 Implementacje

| Adapter | Plik | Użycie |
|---------|------|--------|
| `SupabaseStorageAdapter` | `src/lib/storage/supabase.ts` | Obecny — wrapper na istniejące API |
| `MinioStorageAdapter` | `src/lib/storage/minio.ts` | Docelowy — MinIO S3-compatible |

### 2.3 Fabryka + konfiguracja

```typescript
// src/lib/storage/index.ts
import { StorageAdapter } from "./types";

export function getStorageAdapter(): StorageAdapter {
  const provider = process.env.STORAGE_PROVIDER ?? "supabase";
  if (provider === "minio") {
    return new MinioStorageAdapter(/* config z env */);
  }
  return new SupabaseStorageAdapter(/* istniejący klient */);
}
```

Przełączenie: zmiana `STORAGE_PROVIDER=minio` w env Vercel.

### 2.4 Zakres refaktoryzacji kodu

Operacje do przepisania na adapter (13 miejsc):

| Plik | Operacja | Bucket |
|------|----------|--------|
| `src/lib/admin-actions.ts:202` | upload | case-documents |
| `src/lib/admin-actions.ts:120` | remove | case-documents |
| `src/lib/client-actions.ts:52` | upload | case-documents |
| `src/lib/client-actions.ts:151` | remove | case-documents |
| `src/lib/fdk-actions.ts:1152` | remove | fdk-attachments |
| `src/app/api/fdk/attachments/upload/route.ts:60` | upload | fdk-attachments |
| `src/app/api/fdk/attachments/upload/route.ts:283` | createSignedUploadUrl | fdk-attachments |
| `src/app/api/fdk/attachments/[id]/route.ts:38` | createSignedUrl (preview) | fdk-attachments |
| `src/app/api/fdk/attachments/[id]/route.ts:329` | download (stream) | fdk-attachments |
| `src/app/api/documents/[id]/download/route.ts:44` | createSignedUrl | case-documents |
| `src/app/api/documents/download-all/route.ts:55` | download (ZIP) | case-documents |
| `src/app/api/cron/anonymize-old-cases/route.ts:55` | remove (batch) | case-documents |
| Skrypty scrape (scripts/*.mjs) | download | fdk-attachments |

**Presigned URLs**: MinIO obsługuje natywnie presigned GET/PUT — API identyczne z S3. 
Dla preview (signed URL redirect) — MinIO wygeneruje URL na `https://minio.getpermit.pl/...`, ale VPS musi mieć publiczny certyfikat TLS (Let's Encrypt).

### 2.5 Bezpieczeństwo MinIO

| Wymóg | Rozwiązanie |
|-------|-------------|
| Brak publicznego dostępu | Buckety: policy `private`, dostęp wyłącznie przez presigned URLs lub adapter |
| Szyfrowanie in-transit | TLS (Let's Encrypt na nginx reverse proxy) |
| Szyfrowanie at-rest | MinIO Server-Side Encryption (SSE-S3) z kluczem zarządzanym przez MinIO KES lub env |
| Wersjonowanie | MinIO bucket versioning (włączone) — umożliwia odzyskanie przypadkowo usuniętych plików |
| Kosz | Object Lock / lifecycle rule: usunięte obiekty trzymane 30 dni przed finalnym usunięciem |
| Audyt dostępu | MinIO audit log → plik/syslog |

## 3. Plan migracji plików

### 3.1 Etapy

```
Etap 0: Setup MinIO na VPS                    [~4h]
Etap 1: Adapter layer w kodzie                [~6h]
Etap 2: Podwójny zapis (dual-write)           [~2h]
         Upload → Supabase + MinIO
         Download → Supabase (primary)
Etap 3: Kopiowanie historycznych plików        [~2h]
         mc mirror + weryfikacja sum kontrolnych
Etap 4: Przełączenie odczytu na MinIO         [~1h]
         Download → MinIO (primary)
Etap 5: Weryfikacja (1-2 dni obserwacji)
Etap 6: Wygaszenie Supabase Storage           [~1h]
```

### 3.2 Kopiowanie plików

```bash
# MinIO Client (mc) — sync z Supabase S3 endpoint
# Supabase udostępnia endpoint S3-compatible: s3://eicqctwbqgzcajovmvcb.supabase.co

# Konfiguracja
mc alias set supabase https://eicqctwbqgzcajovmvcb.supabase.co/storage/v1/s3 ACCESS_KEY SECRET_KEY
mc alias set dhosting https://minio.getpermit.pl MINIO_ACCESS MINIO_SECRET

# Mirror z weryfikacją
mc mirror --checksum supabase/fdk-attachments dhosting/fdk-attachments
mc mirror --checksum supabase/case-documents dhosting/case-documents

# Raport zgodności
mc stat --recursive supabase/fdk-attachments > supabase-inventory.txt
mc stat --recursive dhosting/fdk-attachments > minio-inventory.txt
diff supabase-inventory.txt minio-inventory.txt
```

### 3.3 Weryfikacja

- Porównanie liczby obiektów w każdym buckecie
- Porównanie sum MD5/ETag
- Losowe pobranie 20 plików z MinIO i porównanie z oryginałem
- Test end-to-end: upload → download → preview w panelu

## 4. Baza danych — dwa warianty

### Wariant A: Baza zostaje w Supabase (eu-west-1)

| Aspekt | Ocena |
|--------|-------|
| Lokalizacja | UE (Irlandia) — RODO OK |
| Latencja z Vercel fra1 | ~10-15 ms (Frankfurt→Dublin) — akceptowalna |
| Backupy | Supabase Pro: codzienne, 7 dni retencji |
| Administracja | Zero — zarządzane przez Supabase |
| Koszt | $25/mies. (Pro) — obecny plan |
| Dostępność | 99.9% SLA (Pro) |
| Ryzyko | Vendor lock-in, ale Prisma ułatwia migrację |
| Monitoring | Dashboard Supabase + pg_stat |

**Plusy**: zero administracji, niezawodność, automatyczne backupy, connection pooling (PgBouncer).
**Minusy**: dane w Irlandii (nie w Polsce), zależność od Supabase.

### Wariant B: PostgreSQL na VPS dhosting

| Aspekt | Ocena |
|--------|-------|
| Lokalizacja | Polska — pełna kontrola |
| Latencja z Vercel fra1 | ~5-10 ms (Frankfurt→Polska) — porównywalna |
| Backupy | Własne: pg_dump cron + wysyłka na drugi serwer/S3 |
| Administracja | Wymagana: aktualizacje PG, monitoring, tuning |
| Koszt | Wliczone w VPS (~100-150 zł/mies.) |
| Dostępność | Zależna od VPS — brak failover bez dodatkowej konfiguracji |
| Ryzyko | Single point of failure, wymaga kompetencji DBA |
| Monitoring | Własne: pg_stat_activity, Prometheus/Grafana lub proste crony |

**Plusy**: dane w Polsce, pełna kontrola, niższy koszt, brak vendor lock-in.
**Minusy**: wymaga administracji (aktualizacje, backupy, monitoring, security patching), single point of failure, brak automatycznego failover.

### Wymagania bezpieczeństwa (wariant B)

```
- PostgreSQL 16 z TLS (self-signed cert lub Let's Encrypt)
- Firewall: port 5432 otwarty TYLKO dla IP Vercel (CIDR Vercel edge: zmienny — 
  wymaga allow-list lub WireGuard tunel)
- pg_hba.conf: SSL required, user/password auth
- pg_dump cron: codziennie 3:00 → /backup/ + rsync na drugi serwer
- Retencja backupów: 30 dni
- Monitoring: pg_isready check + alert email
- Aktualizacje: unattended-upgrades dla security patches
```

### Rekomendacja

**Wariant A (Supabase)** — na obecnym etapie. Powody:
1. Baza jest już w UE (RODO OK)
2. Zero administracji — zespół nie ma dedykowanego DBA
3. Automatyczne backupy i monitoring
4. Failover i HA wbudowane
5. Storage to główny problem (skany paszportów) — baza zawiera dane osobowe ale nie pliki binarne

Wariant B wart rozważenia gdy: (a) zespół urośnie i pojawi się DevOps, (b) koszty Supabase wzrosną, (c) regulacje wymagą danych stricte w Polsce (nie UE ogólnie).

## 5. Vercel Functions → fra1

```jsonc
// vercel.json — dodać:
{
  "regions": ["fra1"]
}
```

Wymaga upgrade do Vercel Pro ($20/mies./członek zespołu).
Po zmianie: wszystkie serverless functions uruchamiają się we Frankfurcie.
Efekt: dane osobowe przetwarzane w UE (request → Vercel fra1 → MinIO PL / Supabase IE).

## 6. Specyfikacja VPS dhosting

### Minimalna konfiguracja

| Parametr | Wartość | Uzasadnienie |
|----------|---------|-------------|
| CPU | 2 vCPU | MinIO: 1 core wystarczy, zapas na burst |
| RAM | 4 GB | MinIO: ~500 MB idle, 1-2 GB pod obciążeniem, system + nginx |
| Dysk | 100 GB SSD | Obecne dane: ~15 GB (szacunek z 555 dyplomów + ~1200 decyzji + case-documents). Zapas 5x |
| System | Ubuntu 24.04 LTS | Długoterminowe wsparcie, unattended-upgrades |
| Transfer | Unlimited lub >= 1 TB/mies. | Ruch z Vercela + upload/download użytkowników |

### Rozszerzona (z PostgreSQL — wariant B)

| Parametr | Wartość |
|----------|---------|
| CPU | 4 vCPU |
| RAM | 8 GB (PG shared_buffers=2GB + MinIO + system) |
| Dysk | 150 GB SSD (baza ~2 GB + storage + backupy) |

### Software stack

```
Ubuntu 24.04 LTS
├── MinIO (latest stable) — S3-compatible storage
├── nginx — reverse proxy + TLS termination (Let's Encrypt)
├── certbot — auto-renewal certyfikatów
├── ufw — firewall
├── fail2ban — brute-force protection
├── unattended-upgrades — security patches
├── (opcja B) PostgreSQL 16
└── (monitoring) node_exporter + MinIO metrics → Grafana Cloud free tier
```

### Firewall (ufw)

```
# Default: deny incoming
ufw default deny incoming
ufw default allow outgoing

# SSH (ograniczony do znanego IP)
ufw allow from TWOJE_IP to any port 22

# MinIO API (tylko Vercel edge IPs + Twoje IP)
# Vercel nie ma stałych IP — alternatywa: WireGuard tunel lub Cloudflare Tunnel
ufw allow from 0.0.0.0/0 to any port 443  # nginx (TLS) — autoryzacja na poziomie MinIO

# MinIO Console (tylko admin IP)
ufw allow from TWOJE_IP to any port 9001

# (opcja B) PostgreSQL
ufw allow from VERCEL_CIDR to any port 5432  # problematyczne — Vercel nie ma stałych IP
```

**Problem z Vercel IP**: Vercel serverless nie ma stałych IP wyjściowych. Rozwiązania:
1. **Cloudflare Tunnel** (rekomendowane) — MinIO za tunelem, brak otwartych portów
2. **WireGuard** — VPN tunel Vercel→VPS (wymaga Vercel Pro + custom networking)
3. **API key + TLS** — MinIO dostępny publicznie przez HTTPS, autoryzacja przez access/secret key (jak S3). Bezpieczne ale wymaga silnych kluczy

Rekomendacja: **opcja 3** (MinIO za nginx z TLS, autoryzacja kluczami S3) — najprostsza, wystarczająco bezpieczna z TLS + silne klucze. Buckety private, brak publicznych URL-i.

### Backup VPS

```bash
# Cron: /etc/cron.d/backup-minio
# Codziennie 3:00 — snapshot MinIO data do tar.gz
0 3 * * * root tar czf /backup/minio-$(date +\%Y\%m\%d).tar.gz /data/minio && \
  find /backup -name "minio-*.tar.gz" -mtime +30 -delete

# (opcja B) pg_dump
0 4 * * * postgres pg_dump -Fc getpermit > /backup/pg-$(date +\%Y\%m\%d).dump && \
  find /backup -name "pg-*.dump" -mtime +30 -delete

# Offsite: rsync do drugiego serwera lub rclone do S3/Backblaze
0 5 * * * root rclone sync /backup backblaze:getpermit-backups --max-age 7d
```

## 7. Wycena godzinowa

| Etap | Zakres | Godziny |
|------|--------|---------|
| 0 | Setup VPS: MinIO + nginx + TLS + firewall | 4h |
| 1 | Adapter layer: interfejs + 2 implementacje + testy | 6h |
| 2 | Refaktoryzacja 13 miejsc w kodzie na adapter | 4h |
| 3 | Dual-write mode + testy | 2h |
| 4 | Migracja plików (mc mirror + weryfikacja) | 2h |
| 5 | Przełączenie + monitoring | 1h |
| 6 | Vercel Pro upgrade + fra1 | 0.5h |
| 7 | Dokumentacja + testy end-to-end | 2h |
| 8 | Wygaszenie Supabase Storage | 1h |
| **Łącznie** | | **22.5h** |

Bufor na nieprzewidziane problemy: +20% = **~27h**

## 8. Harmonogram etapów

| Tydzień | Etap | Opis |
|---------|------|------|
| T1 | 0 + 6 | Setup VPS + Vercel Pro/fra1 |
| T1-T2 | 1 + 2 | Adapter layer + refaktoryzacja kodu |
| T2 | 3 | Dual-write mode — deploy na produkcję |
| T2 | 4 | Mirror plików Supabase → MinIO |
| T3 | 5 | Przełączenie odczytu → MinIO |
| T3-T4 | 5 (cont.) | Okres obserwacji (3-5 dni roboczych) |
| T4 | 7 + 8 | Dokumentacja + wygaszenie Supabase Storage |

**Łączny czas realizacji**: 3-4 tygodnie (z okresem obserwacji).
**Zero downtime**: podwójny zapis gwarantuje ciągłość pracy panelu.

## 9. Koszty utrzymania (miesięcznie)

| Pozycja | Wariant A (baza Supabase) | Wariant B (baza na VPS) |
|---------|---------------------------|-------------------------|
| VPS dhosting (MinIO) | ~100-120 zł | ~150-180 zł (większy VPS) |
| Supabase Pro (baza) | ~100 zł ($25) | 0 zł |
| Vercel Pro | ~80 zł ($20) | ~80 zł ($20) |
| Domena/DNS | ~5 zł | ~5 zł |
| Backupy offsite | ~10 zł (Backblaze B2) | ~10 zł |
| **Łącznie** | **~295-315 zł/mies.** | **~245-275 zł/mies.** |

Obecny koszt (bez VPS): ~185 zł/mies. (Supabase + Vercel Hobby).
Wzrost: +110-130 zł/mies. (wariant A) lub +60-90 zł/mies. (wariant B).
