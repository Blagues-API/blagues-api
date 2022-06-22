-- CreateTable
CREATE TABLE "upvotes" (
    "proposal_id" INTEGER NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "upvotes_pkey" PRIMARY KEY ("proposal_id","user_id")
);

-- CreateTable
CREATE TABLE "downvotes" (
    "proposal_id" INTEGER NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "downvotes_pkey" PRIMARY KEY ("proposal_id","user_id")
);

-- CreateIndex
CREATE INDEX "upvotes_proposal_id" ON "upvotes"("proposal_id");

-- CreateIndex
CREATE INDEX "downvotes_proposal_id" ON "downvotes"("proposal_id");

-- AddForeignKey
ALTER TABLE "upvotes" ADD CONSTRAINT "upvotes_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "downvotes" ADD CONSTRAINT "downvotes_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
