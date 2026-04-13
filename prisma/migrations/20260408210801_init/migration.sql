-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "CaseType" AS ENUM ('TEMPORARY_RESIDENCE', 'PERMANENT_RESIDENCE', 'WORK_PERMIT_A', 'WORK_PERMIT_B', 'BLUE_CARD', 'CITIZENSHIP', 'INVITATION', 'OTHER');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('SUBMITTED', 'IN_PROGRESS', 'SUPPLEMENT_REQUIRED', 'DECISION_POSITIVE', 'DECISION_NEGATIVE', 'APPEAL');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('APPLICATION_SUBMITTED', 'OFFICE_CONFIRMATION', 'SUPPLEMENT_REQUEST', 'SUPPLEMENT_SENT', 'DECISION', 'APPEAL', 'OTHER');

-- CreateEnum
CREATE TYPE "AccessAction" AS ENUM ('VIEW_CASE', 'VIEW_DOCUMENT', 'DOWNLOAD_DOCUMENT', 'CREATE_CASE', 'UPDATE_CASE', 'CREATE_EVENT', 'UPLOAD_DOCUMENT');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'pl',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "CaseType" NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'SUBMITTED',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "submitted_at" TIMESTAMP(3),
    "expected_decision_at" TIMESTAMP(3),
    "assigned_staff_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_events" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "event_type" "EventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "event_date" TIMESTAMP(3) NOT NULL,
    "created_by_staff_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "description" TEXT,
    "uploaded_by_staff_id" UUID,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "case_id" UUID,
    "action" "AccessAction" NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "cases_user_id_idx" ON "cases"("user_id");

-- CreateIndex
CREATE INDEX "cases_status_idx" ON "cases"("status");

-- CreateIndex
CREATE INDEX "cases_assigned_staff_id_idx" ON "cases"("assigned_staff_id");

-- CreateIndex
CREATE INDEX "case_events_case_id_idx" ON "case_events"("case_id");

-- CreateIndex
CREATE INDEX "case_events_event_date_idx" ON "case_events"("event_date");

-- CreateIndex
CREATE INDEX "documents_case_id_idx" ON "documents"("case_id");

-- CreateIndex
CREATE INDEX "access_logs_case_id_timestamp_idx" ON "access_logs"("case_id", "timestamp");

-- CreateIndex
CREATE INDEX "access_logs_user_id_timestamp_idx" ON "access_logs"("user_id", "timestamp");

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_assigned_staff_id_fkey" FOREIGN KEY ("assigned_staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_staff_id_fkey" FOREIGN KEY ("uploaded_by_staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
