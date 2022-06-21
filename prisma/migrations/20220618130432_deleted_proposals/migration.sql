-- DropForeignKey
ALTER TABLE "approvals" DROP CONSTRAINT "approvals_proposal_id_fkey";

-- DropForeignKey
ALTER TABLE "disapprovals" DROP CONSTRAINT "disapprovals_proposal_id_fkey";

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disapprovals" ADD CONSTRAINT "disapprovals_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
