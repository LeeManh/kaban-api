-- CreateEnum
CREATE TYPE "TemplateVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- DropIndex
DROP INDEX "boards_is_template_template_category_idx";

-- AlterTable
ALTER TABLE "boards" ADD COLUMN     "template_visibility" "TemplateVisibility";

-- CreateIndex
CREATE INDEX "boards_is_template_template_visibility_template_category_idx" ON "boards"("is_template", "template_visibility", "template_category");
