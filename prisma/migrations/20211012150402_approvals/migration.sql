-- CreateTable
CREATE TABLE "approvals" (
    "proposal_id" INTEGER NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("proposal_id", "user_id")
);

-- CreateIndex
CREATE INDEX "approvals_proposal_id" ON "approvals"("proposal_id");

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
