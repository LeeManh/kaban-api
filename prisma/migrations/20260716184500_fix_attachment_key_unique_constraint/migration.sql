-- DropIndex
DROP INDEX "attachments_key_key";

-- CreateIndex
CREATE UNIQUE INDEX "attachments_key_card_id_key" ON "attachments"("key", "card_id");
