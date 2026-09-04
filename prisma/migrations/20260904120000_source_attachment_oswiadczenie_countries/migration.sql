-- AlterTable: dodaj source_attachment_id do fdk_employment_bases
ALTER TABLE "fdk_employment_bases" ADD COLUMN "source_attachment_id" INTEGER;

-- CreateIndex: indeks na source_attachment_id
CREATE INDEX "fdk_employment_bases_source_attachment_id_idx" ON "fdk_employment_bases"("source_attachment_id");

-- CreateIndex: unikalny indeks (foreigner + attachment + typ) — idempotentność scrapera
-- Uwaga: partial unique index — tylko gdy source_attachment_id IS NOT NULL
-- (istniejące rekordy bez powiązania z załącznikiem nie powinny kolidować)
CREATE UNIQUE INDEX "uq_foreigner_attachment_type" ON "fdk_employment_bases"("foreigner_id", "source_attachment_id", "typ") WHERE "source_attachment_id" IS NOT NULL;

-- CreateTable: tabela krajów uprawnionych do oświadczeń
CREATE TABLE "oswiadczenie_countries" (
    "id" SERIAL NOT NULL,
    "country_code" VARCHAR(3) NOT NULL,
    "country_name" TEXT NOT NULL,
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),

    CONSTRAINT "oswiadczenie_countries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unikalny indeks na country_code
CREATE UNIQUE INDEX "oswiadczenie_countries_country_code_key" ON "oswiadczenie_countries"("country_code");

-- Seed: wstępne wartości krajów
INSERT INTO "oswiadczenie_countries" ("country_code", "country_name", "valid_from", "valid_to") VALUES
  ('AM', 'Armenia', NULL, NULL),
  ('BY', 'Białoruś', NULL, NULL),
  ('MD', 'Mołdawia', NULL, NULL),
  ('UA', 'Ukraina', NULL, NULL),
  ('RU', 'Rosja', NULL, '2022-10-28'),
  ('GE', 'Gruzja', NULL, NULL);
-- UWAGA: data valid_to dla Gruzji wymaga potwierdzenia przez dział legalizacji.
-- Tymczasowo ustawiona jako NULL (bez daty końcowej).
