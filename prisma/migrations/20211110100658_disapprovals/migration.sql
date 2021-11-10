-- CreateTable
CREATE TABLE "disapprovals" (
    "proposal_id" INTEGER NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "disapprovals_pkey" PRIMARY KEY ("proposal_id","user_id")
);

-- CreateIndex
CREATE INDEX "disapprovals_proposal_id" ON "disapprovals"("proposal_id");

-- AddForeignKey
ALTER TABLE "disapprovals" ADD CONSTRAINT "disapprovals_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "proposals" ADD COLUMN "refused" BOOLEAN NOT NULL DEFAULT false;
