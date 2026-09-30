-- Add hidden/archived flag and employee sync fields to fdk_foreigners
ALTER TABLE "fdk_foreigners" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "fdk_foreigners" ADD COLUMN "employee_id" TEXT;
ALTER TABLE "fdk_foreigners" ADD COLUMN "external_user_id" TEXT;

-- Index for filtering hidden/active
CREATE INDEX "fdk_foreigners_hidden_idx" ON "fdk_foreigners"("hidden");
