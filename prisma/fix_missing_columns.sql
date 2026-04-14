-- Add missing columns to documents table
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "document_type" "DocumentType";
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "uploaded_by_user_id" UUID;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "verification_status" "VerificationStatus";

-- Add foreign key if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_uploaded_by_user_id_fkey') THEN
    ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_fkey"
      FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Create messages table if not exists
CREATE TABLE IF NOT EXISTS "messages" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- Create index if not exists
CREATE INDEX IF NOT EXISTS "messages_case_id_created_at_idx" ON "messages"("case_id", "created_at");

-- Add foreign keys for messages if not exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_case_id_fkey') THEN
    ALTER TABLE "messages" ADD CONSTRAINT "messages_case_id_fkey"
      FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_sender_id_fkey') THEN
    ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey"
      FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
