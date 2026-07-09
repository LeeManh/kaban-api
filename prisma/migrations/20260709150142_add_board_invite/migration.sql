-- CreateTable
CREATE TABLE "board_invites" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "token_hash" TEXT NOT NULL,
    "invited_by_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "board_invites_token_hash_key" ON "board_invites"("token_hash");

-- CreateIndex
CREATE INDEX "board_invites_board_id_idx" ON "board_invites"("board_id");

-- CreateIndex
CREATE INDEX "board_invites_email_idx" ON "board_invites"("email");

-- AddForeignKey
ALTER TABLE "board_invites" ADD CONSTRAINT "board_invites_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_invites" ADD CONSTRAINT "board_invites_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
