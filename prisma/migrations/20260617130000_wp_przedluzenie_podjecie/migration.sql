-- Zezwolenie na pracę: nowe pola
ALTER TABLE "fdk_employment_bases" ADD COLUMN "przedluzenie" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "fdk_employment_bases" ADD COLUMN "przewidywana_data_podjecia" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "fdk_employment_bases" ADD COLUMN "przewidywana_data_komentarz" TEXT;
ALTER TABLE "fdk_employment_bases" ADD COLUMN "reminder_date" TIMESTAMP;
ALTER TABLE "fdk_employment_bases" ADD COLUMN "reminder_calendar_event_id" INTEGER;
