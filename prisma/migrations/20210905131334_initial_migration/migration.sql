-- CreateTable
CREATE TABLE "users" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "user_name" TEXT NOT NULL,
    "user_avatar" TEXT NOT NULL,
    "user_token" TEXT NOT NULL,
    "user_token_refresh" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "token_key" TEXT NOT NULL,
    "limit" INTEGER NOT NULL DEFAULT 100
);

-- CreateIndex
CREATE INDEX "users_user_id" ON "users"("user_id");
