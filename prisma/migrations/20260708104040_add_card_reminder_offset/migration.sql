-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "reminder_offset_minutes" INTEGER;

-- Giữ hành vi cũ: card đã có due_date thì mặc định nhắc đúng lúc hết hạn (offset = 0).
UPDATE "cards" SET "reminder_offset_minutes" = 0 WHERE "due_date" IS NOT NULL;
