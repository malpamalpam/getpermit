-- Oświadczenie: nowe pola podjęcia pracy
ALTER TABLE "fdk_employment_bases" ADD COLUMN "podjecie_pracy_status" TEXT;
ALTER TABLE "fdk_employment_bases" ADD COLUMN "podjecie_pracy_data" TIMESTAMP;
ALTER TABLE "fdk_employment_bases" ADD COLUMN "data_startu" TIMESTAMP;
ALTER TABLE "fdk_employment_bases" ADD COLUMN "osw_calendar_event_ids" TEXT;
