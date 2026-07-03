-- AlterTable: CaseEvent — dodaj pole assigned_to_id
ALTER TABLE "case_events" ADD COLUMN "assigned_to_id" UUID;

-- AddForeignKey
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_assigned_to_id_fkey"
    FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: FdkEmploymentBase — dodaj pole wynagrodzenie
ALTER TABLE "fdk_employment_bases" ADD COLUMN "wynagrodzenie" TEXT;

-- AlterTable: FdkEmploymentBase — dodaj daty zgłoszenia/podjęcia/niepodjęcia/zakończenia
ALTER TABLE "fdk_employment_bases" ADD COLUMN "data_zgloszenia_umowy" TIMESTAMP(3);
ALTER TABLE "fdk_employment_bases" ADD COLUMN "data_podjecia_pracy" TIMESTAMP(3);
ALTER TABLE "fdk_employment_bases" ADD COLUMN "data_niepodjecia_pracy" TIMESTAMP(3);
ALTER TABLE "fdk_employment_bases" ADD COLUMN "data_zakonczenia_pracy" TIMESTAMP(3);
