-- CreateEnum
CREATE TYPE "InviteLinkPermission" AS ENUM ('OPEN', 'APPROVAL');

-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "board_invite_links" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "permission" "InviteLinkPermission" NOT NULL DEFAULT 'OPEN',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_invite_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_join_requests" (
    "id" TEXT NOT NULL,
    "invite_link_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),

    CONSTRAINT "board_join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "board_invite_links_board_id_key" ON "board_invite_links"("board_id");

-- CreateIndex
CREATE UNIQUE INDEX "board_invite_links_token_hash_key" ON "board_invite_links"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "board_join_requests_invite_link_id_user_id_key" ON "board_join_requests"("invite_link_id", "user_id");

-- AddForeignKey
ALTER TABLE "board_invite_links" ADD CONSTRAINT "board_invite_links_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_invite_links" ADD CONSTRAINT "board_invite_links_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_join_requests" ADD CONSTRAINT "board_join_requests_invite_link_id_fkey" FOREIGN KEY ("invite_link_id") REFERENCES "board_invite_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_join_requests" ADD CONSTRAINT "board_join_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
