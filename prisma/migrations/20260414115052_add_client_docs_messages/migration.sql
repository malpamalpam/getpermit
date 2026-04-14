-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PASSPORT', 'RESIDENCE_CARD', 'DIPLOMA', 'WORK_CERTIFICATE', 'EMPLOYMENT_CONTRACT', 'REGISTRATION_CERTIFICATE', 'MARRIAGE_CERTIFICATE', 'BIRTH_CERTIFICATE', 'RESIDENCE_PROOF', 'HEALTH_INSURANCE', 'BIOMETRIC_PHOTO', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'NEEDS_CORRECTION');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AccessAction" ADD VALUE 'UPLOAD_CLIENT_DOCUMENT';
ALTER TYPE "AccessAction" ADD VALUE 'DELETE_CLIENT_DOCUMENT';
ALTER TYPE "AccessAction" ADD VALUE 'VERIFY_DOCUMENT';
ALTER TYPE "AccessAction" ADD VALUE 'SEND_MESSAGE';

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "document_type" "DocumentType",
ADD COLUMN     "uploaded_by_user_id" UUID,
ADD COLUMN     "verification_status" "VerificationStatus";

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messages_case_id_created_at_idx" ON "messages"("case_id", "created_at");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
