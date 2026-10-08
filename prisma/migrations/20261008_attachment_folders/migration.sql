-- Add folder classification fields to fdk_attachments
ALTER TABLE "fdk_attachments" ADD COLUMN "folder" TEXT;
ALTER TABLE "fdk_attachments" ADD COLUMN "detected_type" TEXT;
ALTER TABLE "fdk_attachments" ADD COLUMN "folder_manual" BOOLEAN NOT NULL DEFAULT false;

-- Index for folder grouping
CREATE INDEX "fdk_attachments_folder_idx" ON "fdk_attachments"("folder");
