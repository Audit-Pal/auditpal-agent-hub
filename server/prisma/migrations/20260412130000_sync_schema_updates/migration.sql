-- AlterEnum: add missing ReportStatus values
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'LOW_EFFORT';
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'AI_TRIAGE_PENDING';
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'AI_TRIAGED';
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'ESCALATED';
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';

-- AlterTable agents: add missing columns
ALTER TABLE "agents"
ADD COLUMN IF NOT EXISTS "slug" TEXT,
ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

-- AlterTable reports: add missing columns
ALTER TABLE "reports"
ADD COLUMN IF NOT EXISTS "codeSnippet" TEXT,
ADD COLUMN IF NOT EXISTS "errorLocation" TEXT,
ADD COLUMN IF NOT EXISTS "structuredData" JSONB,
ADD COLUMN IF NOT EXISTS "aiScore" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "aiSummary" TEXT,
ADD COLUMN IF NOT EXISTS "validationDecision" TEXT,
ADD COLUMN IF NOT EXISTS "validationNotes" TEXT;

-- AlterTable users: add missing columns
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "apiKeyHash" TEXT,
ADD COLUMN IF NOT EXISTS "apiKeyPreview" TEXT,
ADD COLUMN IF NOT EXISTS "apiKeyCreatedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "apiKeyLastUsedAt" TIMESTAMP(3);

-- AlterTable scope_targets: add missing columns
ALTER TABLE "scope_targets"
ADD COLUMN IF NOT EXISTS "sourceCode" TEXT;

-- CreateIndex (safe, skips if already exists)
CREATE UNIQUE INDEX IF NOT EXISTS "agents_slug_key" ON "agents"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "users_apiKeyHash_key" ON "users"("apiKeyHash");

-- Create Missing Enums
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProgramStatus') THEN
        CREATE TYPE "ProgramStatus" AS ENUM ('DRAFT', 'AWAITING_FUNDS', 'ACTIVE', 'PAUSED', 'CLOSED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VulnerabilityStatus') THEN
        CREATE TYPE "VulnerabilityStatus" AS ENUM ('PENDING', 'ESCALATED', 'ACCEPTED', 'REJECTED', 'DUPLICATE');
    END IF;
END $$;

-- AlterTable programs: add status
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "status" "ProgramStatus" NOT NULL DEFAULT 'DRAFT';

-- Create Vulnerability table if missing
CREATE TABLE IF NOT EXISTS "vulnerabilities" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "target" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "proof" TEXT NOT NULL,
    "codeSnippet" TEXT,
    "errorLocation" TEXT,
    "status" "VulnerabilityStatus" NOT NULL DEFAULT 'PENDING',
    "validationDecision" TEXT,
    "validationNotes" TEXT,
    "rewardPaidUsd" INTEGER,
    "rewardTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vulnerabilities_pkey" PRIMARY KEY ("id")
);

-- Add missing constraints for Vulnerability
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'vulnerabilities_reportId_fkey'
  ) THEN
    ALTER TABLE "vulnerabilities" ADD CONSTRAINT "vulnerabilities_reportId_fkey"
      FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey (only if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'agents_ownerId_fkey'
  ) THEN
    ALTER TABLE "agents" ADD CONSTRAINT "agents_ownerId_fkey"
      FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
