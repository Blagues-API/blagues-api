-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('UP', 'DOWN');

-- CreateTable
CREATE TABLE "votes" (
    "proposal_id" INTEGER NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "type" "VoteType" NOT NULL,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("proposal_id","user_id")
);

-- CreateIndex
CREATE INDEX "votes_proposal_id" ON "votes"("proposal_id");

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
