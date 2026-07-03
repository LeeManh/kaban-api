-- CreateTable
CREATE TABLE "board_views" (
    "user_id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_views_pkey" PRIMARY KEY ("user_id","board_id")
);

-- CreateIndex
CREATE INDEX "board_views_user_id_viewed_at_idx" ON "board_views"("user_id", "viewed_at");

-- AddForeignKey
ALTER TABLE "board_views" ADD CONSTRAINT "board_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_views" ADD CONSTRAINT "board_views_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
