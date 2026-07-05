/*
  Warnings:

  - Made the column `background` on table `boards` required. This step will fail if there are existing NULL values in that column.

*/
-- Backfill existing boards before enforcing NOT NULL
UPDATE "boards" SET "background" = '#2563eb' WHERE "background" IS NULL;

-- AlterTable
ALTER TABLE "boards" ALTER COLUMN "background" SET NOT NULL;
