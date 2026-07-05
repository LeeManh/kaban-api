-- CreateTable
CREATE TABLE "board_stars" (
    "user_id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_stars_pkey" PRIMARY KEY ("user_id","board_id")
);

-- CreateIndex
CREATE INDEX "board_stars_user_id_idx" ON "board_stars"("user_id");

-- AddForeignKey
ALTER TABLE "board_stars" ADD CONSTRAINT "board_stars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_stars" ADD CONSTRAINT "board_stars_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
