-- CreateTable
CREATE TABLE "godfathers" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "emoji_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "godfathers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "godfathers_user_id_key" ON "godfathers"("user_id");

-- CreateIndex
CREATE INDEX "godfathers_user_id" ON "godfathers"("user_id");
