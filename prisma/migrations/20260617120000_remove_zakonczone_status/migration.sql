-- Migrate existing ZAKONCZONE records to WYGASLE
UPDATE "fdk_employment_bases" SET "status" = 'WYGASLE' WHERE "status" = 'ZAKONCZONE';

-- Remove ZAKONCZONE from enum
ALTER TYPE "FdkStatus" RENAME TO "FdkStatus_old";
CREATE TYPE "FdkStatus" AS ENUM ('AKTYWNE', 'WYGASLE', 'UCHYLONE', 'UMORZONE', 'W_TRAKCIE', 'BRAK_DANYCH');
ALTER TABLE "fdk_employment_bases" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "fdk_employment_bases" ALTER COLUMN "status" TYPE "FdkStatus" USING ("status"::text::"FdkStatus");
ALTER TABLE "fdk_employment_bases" ALTER COLUMN "status" SET DEFAULT 'BRAK_DANYCH';
DROP TYPE "FdkStatus_old";
