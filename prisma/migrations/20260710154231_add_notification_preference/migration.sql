-- CreateEnum
CREATE TYPE "EmailFrequency" AS ENUM ('NEVER', 'INSTANT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CARD_REMOVED';
ALTER TYPE "NotificationType" ADD VALUE 'ATTACHMENT_ADDED';
ALTER TYPE "NotificationType" ADD VALUE 'CARD_MOVED';

-- CreateTable
CREATE TABLE "notification_preferences" (
    "user_id" TEXT NOT NULL,
    "email_frequency" "EmailFrequency" NOT NULL DEFAULT 'INSTANT',
    "comments_enabled" BOOLEAN NOT NULL DEFAULT true,
    "due_dates_enabled" BOOLEAN NOT NULL DEFAULT true,
    "removed_from_card_enabled" BOOLEAN NOT NULL DEFAULT true,
    "attachments_enabled" BOOLEAN NOT NULL DEFAULT true,
    "cards_moved_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
