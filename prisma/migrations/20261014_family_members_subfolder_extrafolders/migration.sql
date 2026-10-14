-- Migration: family_members_subfolder_extrafolders
-- Date: 2026-10-14
-- Description:
--   1. Add FdkFamilyMember table (relations between foreigners)
--   2. Add subfolder column to fdk_attachments (person name in dokumenty_rodziny)
--   3. Add extra_folders column to fdk_attachments (multi-folder labels)

-- 1. FdkFamilyMember table
CREATE TABLE "fdk_family_members" (
    "id"         SERIAL NOT NULL,
    "head_id"    INTEGER NOT NULL,
    "member_id"  INTEGER NOT NULL,
    "relacja"    TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fdk_family_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fdk_family_members_head_id_member_id_key"
    ON "fdk_family_members"("head_id", "member_id");

CREATE INDEX "fdk_family_members_head_id_idx"
    ON "fdk_family_members"("head_id");

ALTER TABLE "fdk_family_members"
    ADD CONSTRAINT "fdk_family_members_head_id_fkey"
    FOREIGN KEY ("head_id") REFERENCES "fdk_foreigners"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fdk_family_members"
    ADD CONSTRAINT "fdk_family_members_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "fdk_foreigners"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. subfolder column on fdk_attachments
ALTER TABLE "fdk_attachments" ADD COLUMN "subfolder" TEXT;

-- 3. extra_folders column on fdk_attachments
ALTER TABLE "fdk_attachments" ADD COLUMN "extra_folders" TEXT[] NOT NULL DEFAULT '{}';
