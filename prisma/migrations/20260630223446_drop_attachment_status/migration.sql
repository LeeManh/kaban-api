/*
  Warnings:

  - You are about to drop the column `status` on the `attachments` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "attachments_status_created_at_idx";

-- AlterTable
ALTER TABLE "attachments" DROP COLUMN "status";

-- DropEnum
DROP TYPE "AttachmentStatus";
