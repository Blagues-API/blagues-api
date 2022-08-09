/*
  Warnings:

  - A unique constraint covering the columns `[suggestion_id]` on the table `proposals` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('DUPLICATE', 'INAPPROPRIATE');

-- CreateTable
CREATE TABLE "reports" (
    "proposal_id" INTEGER NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "message_id" VARCHAR(255),
    "type" "ReportType" NOT NULL,
    "merged" BOOLEAN NOT NULL DEFAULT false,
    "refused" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("proposal_id","user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reports_proposal_id_key" ON "reports"("proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "reports_message_id_key" ON "reports"("message_id");

-- CreateIndex
CREATE INDEX "reports_proposal_id" ON "reports"("proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "proposals_suggestion_id_key" ON "proposals"("suggestion_id");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_proposal_id_user_id_fkey" FOREIGN KEY ("proposal_id", "user_id") REFERENCES "reports"("proposal_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disapprovals" ADD CONSTRAINT "disapprovals_proposal_id_user_id_fkey" FOREIGN KEY ("proposal_id", "user_id") REFERENCES "reports"("proposal_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
