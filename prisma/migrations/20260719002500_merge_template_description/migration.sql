-- Preserve existing template_description values into description before dropping the column
UPDATE "boards" SET "description" = "template_description" WHERE "template_description" IS NOT NULL AND "description" IS NULL;

-- DropColumn
ALTER TABLE "boards" DROP COLUMN "template_description";
