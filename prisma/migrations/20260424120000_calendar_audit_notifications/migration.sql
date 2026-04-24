-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('OFFICE_VISIT', 'OFFICE_MEETING', 'OTHER');

-- AlterTable: add new fields to fdk_foreigners
ALTER TABLE "fdk_foreigners" ADD COLUMN "jezyk_preferowany" TEXT;
ALTER TABLE "fdk_foreigners" ADD COLUMN "decyzja_pobytowa_do" TIMESTAMP(3);
ALTER TABLE "fdk_foreigners" ADD COLUMN "typ_dokumentu_pobytowego" TEXT;

-- CreateTable: fdk_change_logs
CREATE TABLE "fdk_change_logs" (
    "id" SERIAL NOT NULL,
    "foreigner_id" INTEGER NOT NULL,
    "changed_by" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fdk_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: fdk_notification_logs
CREATE TABLE "fdk_notification_logs" (
    "id" SERIAL NOT NULL,
    "foreigner_id" INTEGER NOT NULL,
    "typ" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fdk_notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: calendar_events
CREATE TABLE "calendar_events" (
    "id" SERIAL NOT NULL,
    "type" "CalendarEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "event_date" TIMESTAMP(3) NOT NULL,
    "event_time" TEXT,
    "place" TEXT,
    "organ" TEXT,
    "foreigner_id" INTEGER,
    "foreigner_name" TEXT,
    "created_by_id" UUID NOT NULL,
    "notes" TEXT,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notification_settings
CREATE TABLE "notification_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "team_notify_frequency_days" INTEGER NOT NULL DEFAULT 14,
    "last_team_notify_sent_at" TIMESTAMP(3),
    "oswiadczenie_days_before" INTEGER NOT NULL DEFAULT 45,
    "zezwolenie_days_before" INTEGER NOT NULL DEFAULT 240,
    "pobyt_days_before" INTEGER NOT NULL DEFAULT 60,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fdk_change_logs_foreigner_id_changed_at_idx" ON "fdk_change_logs"("foreigner_id", "changed_at");
CREATE INDEX "fdk_notification_logs_foreigner_id_sent_at_idx" ON "fdk_notification_logs"("foreigner_id", "sent_at");
CREATE INDEX "calendar_events_event_date_idx" ON "calendar_events"("event_date");
CREATE INDEX "calendar_events_foreigner_id_idx" ON "calendar_events"("foreigner_id");

-- AddForeignKey
ALTER TABLE "fdk_change_logs" ADD CONSTRAINT "fdk_change_logs_foreigner_id_fkey" FOREIGN KEY ("foreigner_id") REFERENCES "fdk_foreigners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fdk_notification_logs" ADD CONSTRAINT "fdk_notification_logs_foreigner_id_fkey" FOREIGN KEY ("foreigner_id") REFERENCES "fdk_foreigners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default notification settings
INSERT INTO "notification_settings" ("id", "team_notify_frequency_days", "oswiadczenie_days_before", "zezwolenie_days_before", "pobyt_days_before", "updated_at")
VALUES (1, 14, 45, 240, 60, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
