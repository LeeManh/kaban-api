-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('BUSINESS', 'DESIGN', 'EDUCATION', 'ENGINEERING', 'MARKETING', 'REMOTE_WORK');

-- AlterTable
ALTER TABLE "boards" ADD COLUMN     "is_template" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "template_category" "TemplateCategory",
ADD COLUMN     "template_description" TEXT;

-- CreateIndex
CREATE INDEX "boards_is_template_template_category_idx" ON "boards"("is_template", "template_category");
