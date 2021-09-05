-- CreateTable
CREATE TABLE "validations" (
    "message_id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "validations_message_id" ON "validations"("message_id");
