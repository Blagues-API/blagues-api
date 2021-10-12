-- CreateEnum
CREATE TYPE "ProposalType" AS ENUM ('SUGGESTION', 'CORRECTION', 'SUGGESTION_CORRECTION');

-- CreateTable
CREATE TABLE "proposals" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(255),
    "message_id" VARCHAR(255),
    "type" "ProposalType" NOT NULL,
    "joke_id" INTEGER,
    "joke_type" VARCHAR(255),
    "joke_question" VARCHAR(255),
    "joke_answer" VARCHAR(255),
    "merged" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suggestion_id" INTEGER,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proposals_message_id_key" ON "proposals"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "proposals_joke_id_key" ON "proposals"("joke_id");

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_suggestion_id_fkey" FOREIGN KEY ("suggestion_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
