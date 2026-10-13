-- Migration: add-residence-bases-and-new-types
-- Date: 2026-10-10
-- Description: Add FdkResidenceBasis model + extend FdkBaseType enum with new types

-- 1. Add new enum values to FdkBaseType
ALTER TYPE "FdkBaseType" ADD VALUE IF NOT EXISTS 'TRC_INNY_PRACODAWCA';
ALTER TYPE "FdkBaseType" ADD VALUE IF NOT EXISTS 'TRC_INNE_OKOLICZNOSCI';
ALTER TYPE "FdkBaseType" ADD VALUE IF NOT EXISTS 'POBYT_STALY';
ALTER TYPE "FdkBaseType" ADD VALUE IF NOT EXISTS 'REZYDENT_UE';
ALTER TYPE "FdkBaseType" ADD VALUE IF NOT EXISTS 'STATUS_UCHODZCY';
ALTER TYPE "FdkBaseType" ADD VALUE IF NOT EXISTS 'OCHRONA_UZUPELNIAJACA';
ALTER TYPE "FdkBaseType" ADD VALUE IF NOT EXISTS 'ZGODA_HUMANITARNA';
ALTER TYPE "FdkBaseType" ADD VALUE IF NOT EXISTS 'OBYWATEL_UE';
ALTER TYPE "FdkBaseType" ADD VALUE IF NOT EXISTS 'UMOWA_WYSTAPIENIA';
ALTER TYPE "FdkBaseType" ADD VALUE IF NOT EXISTS 'WIZA';
ALTER TYPE "FdkBaseType" ADD VALUE IF NOT EXISTS 'WIZA_HUMANITARNA';
ALTER TYPE "FdkBaseType" ADD VALUE IF NOT EXISTS 'RUCH_BEZWIZOWY';
ALTER TYPE "FdkBaseType" ADD VALUE IF NOT EXISTS 'POBYT_NA_PRZEDLUZENIU';
ALTER TYPE "FdkBaseType" ADD VALUE IF NOT EXISTS 'PESEL_UKR';
ALTER TYPE "FdkBaseType" ADD VALUE IF NOT EXISTS 'KARTA_POLAKA';
ALTER TYPE "FdkBaseType" ADD VALUE IF NOT EXISTS 'STATUS_STUDENTA';
ALTER TYPE "FdkBaseType" ADD VALUE IF NOT EXISTS 'STATUS_ABSOLWENTA';

-- 2. Create FdkResidenceBasis table
CREATE TABLE "fdk_residence_bases" (
    "id" SERIAL NOT NULL,
    "foreigner_id" INTEGER NOT NULL,
    "typ" "FdkBaseType" NOT NULL,
    "status" "FdkStatus" NOT NULL DEFAULT 'BRAK_DANYCH',
    "data_od" TIMESTAMP(3),
    "data_do" TIMESTAMP(3),
    "nr_decyzji" TEXT,
    "nr_wizy" TEXT,
    "nr_karty_pobytu" TEXT,
    "karta_pobytu_wazna_do" TIMESTAMP(3),
    "typ_karty_pobytu" TEXT,
    "urzad" TEXT,
    "ostateczna" BOOLEAN,
    "data_ostatecznosci" TIMESTAMP(3),
    "zmieniona_decyzja" TEXT,
    "confidence" DOUBLE PRECISION,
    "source" JSONB DEFAULT '{}',
    "flags" JSONB DEFAULT '[]',
    "uwagi" TEXT,
    "source_attachment_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fdk_residence_bases_pkey" PRIMARY KEY ("id")
);

-- 3. Create indexes
CREATE INDEX "fdk_residence_bases_foreigner_id_idx" ON "fdk_residence_bases"("foreigner_id");
CREATE INDEX "fdk_residence_bases_typ_idx" ON "fdk_residence_bases"("typ");
CREATE INDEX "fdk_residence_bases_status_idx" ON "fdk_residence_bases"("status");
CREATE INDEX "fdk_residence_bases_data_do_idx" ON "fdk_residence_bases"("data_do");
CREATE INDEX "fdk_residence_bases_source_attachment_id_idx" ON "fdk_residence_bases"("source_attachment_id");

-- 4. Create unique constraint for idempotent scraping
CREATE UNIQUE INDEX "uq_residence_foreigner_attachment_type" ON "fdk_residence_bases"("foreigner_id", "source_attachment_id", "typ");

-- 5. Add foreign key
ALTER TABLE "fdk_residence_bases" ADD CONSTRAINT "fdk_residence_bases_foreigner_id_fkey" FOREIGN KEY ("foreigner_id") REFERENCES "fdk_foreigners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
