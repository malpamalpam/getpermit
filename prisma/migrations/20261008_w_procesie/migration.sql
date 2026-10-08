-- Add "w procesie" flag for active TRC cases
ALTER TABLE "fdk_foreigners" ADD COLUMN "w_procesie" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "fdk_foreigners_w_procesie_idx" ON "fdk_foreigners"("w_procesie");
