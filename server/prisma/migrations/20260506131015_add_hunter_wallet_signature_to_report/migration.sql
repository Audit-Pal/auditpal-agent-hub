/*
  Warnings:

  - You are about to drop the column `codeSnippet` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `errorLocation` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `impact` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `proof` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `severity` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `target` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `validationDecision` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `validationNotes` on the `reports` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RewardStatus" AS ENUM ('LOCKED', 'CLAIMABLE', 'CLAIMED', 'EXPIRED', 'REFUNDED');

-- AlterEnum
ALTER TYPE "ReportStatus" ADD VALUE 'CLOSED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'GATEKEEPER';
ALTER TYPE "Role" ADD VALUE 'VALIDATOR';

-- AlterTable
ALTER TABLE "programs" ADD COLUMN     "gatekeeperId" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "validatorId" TEXT;

-- AlterTable
ALTER TABLE "reports" DROP COLUMN "codeSnippet",
DROP COLUMN "errorLocation",
DROP COLUMN "impact",
DROP COLUMN "proof",
DROP COLUMN "severity",
DROP COLUMN "summary",
DROP COLUMN "target",
DROP COLUMN "validationDecision",
DROP COLUMN "validationNotes",
ADD COLUMN     "hunterSignature" TEXT,
ADD COLUMN     "hunterWallet" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "platformCredits" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "reward_escrows" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "escrowAddress" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL DEFAULT 84532,
    "deployTxHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_escrows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_deposits" (
    "id" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "payeeAddress" TEXT NOT NULL,
    "amountWei" TEXT NOT NULL,
    "reportIdHash" TEXT,
    "status" "RewardStatus" NOT NULL DEFAULT 'LOCKED',
    "depositTxHash" TEXT,
    "claimTxHash" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reward_escrows_organizationId_key" ON "reward_escrows"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "reward_escrows_escrowAddress_key" ON "reward_escrows"("escrowAddress");

-- CreateIndex
CREATE UNIQUE INDEX "reward_deposits_reportId_key" ON "reward_deposits"("reportId");

-- CreateIndex
CREATE INDEX "reward_deposits_escrowId_idx" ON "reward_deposits"("escrowId");

-- CreateIndex
CREATE INDEX "reward_deposits_payeeAddress_idx" ON "reward_deposits"("payeeAddress");

-- CreateIndex
CREATE INDEX "vulnerabilities_reportId_idx" ON "vulnerabilities"("reportId");

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_gatekeeperId_fkey" FOREIGN KEY ("gatekeeperId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_validatorId_fkey" FOREIGN KEY ("validatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_escrows" ADD CONSTRAINT "reward_escrows_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_deposits" ADD CONSTRAINT "reward_deposits_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "reward_escrows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_deposits" ADD CONSTRAINT "reward_deposits_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
