-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar" TEXT;

-- RenameIndex
ALTER INDEX "board_invite_links_token_hash_key" RENAME TO "board_invite_links_token_key";
