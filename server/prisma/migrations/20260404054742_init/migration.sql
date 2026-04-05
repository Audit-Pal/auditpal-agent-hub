-- CreateEnum
CREATE TYPE "Role" AS ENUM ('BOUNTY_HUNTER', 'ORGANIZATION', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProgramKind" AS ENUM ('BUG_BOUNTY', 'CROWDSOURCED_AUDIT', 'ATTACK_SIMULATION');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ProgramCategory" AS ENUM ('WEB', 'SMART_CONTRACT', 'APPS', 'BLOCKCHAIN');

-- CreateEnum
CREATE TYPE "PlatformTag" AS ENUM ('ETHEREUM', 'ARBITRUM', 'BASE', 'MONAD', 'SUI', 'SOLANA', 'OFFCHAIN');

-- CreateEnum
CREATE TYPE "ProgrammingLanguage" AS ENUM ('SOLIDITY', 'RUST', 'TYPESCRIPT', 'SWIFT', 'GO', 'MOVE');

-- CreateEnum
CREATE TYPE "ScopeEnvironment" AS ENUM ('MAINNET', 'TESTNET', 'PRODUCTION', 'STAGING', 'OFFCHAIN', 'AUDIT');

-- CreateEnum
CREATE TYPE "ScopeReferenceKind" AS ENUM ('SOURCE_FILE', 'GITHUB_REPO', 'GITHUB_ORG', 'GITHUB_PROFILE', 'CONTRACT_ADDRESS', 'PACKAGE', 'SERVICE', 'RUNBOOK', 'DOMAIN');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('SUBMITTED', 'NEEDS_INFO', 'TRIAGED', 'DUPLICATE', 'REJECTED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ReportSource" AS ENUM ('CROWD_REPORT', 'EXPLOIT_FEED', 'AGENT_DISAGREEMENT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'BOUNTY_HUNTER',
    "reputation" INTEGER NOT NULL DEFAULT 0,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "githubHandle" TEXT,
    "organizationName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "kind" "ProgramKind" NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "accentTone" TEXT NOT NULL DEFAULT 'mint',
    "logoMark" TEXT NOT NULL,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "triagedLabel" TEXT NOT NULL DEFAULT 'Triaged by AuditPal AI + Human Ops',
    "maxBountyUsd" INTEGER NOT NULL,
    "paidUsd" INTEGER NOT NULL DEFAULT 0,
    "scopeReviews" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT,
    "reputationRequired" INTEGER NOT NULL DEFAULT 0,
    "pocRequired" BOOLEAN NOT NULL DEFAULT true,
    "liveMessage" TEXT NOT NULL DEFAULT 'Live program is active now',
    "responseSla" TEXT NOT NULL,
    "payoutCurrency" TEXT NOT NULL DEFAULT 'USDC',
    "payoutWindow" TEXT NOT NULL,
    "duplicatePolicy" TEXT NOT NULL,
    "disclosureModel" TEXT NOT NULL,
    "categories" "ProgramCategory"[],
    "platforms" "PlatformTag"[],
    "languages" "ProgrammingLanguage"[],
    "summaryHighlights" TEXT[],
    "submissionChecklist" TEXT[],

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_tiers" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "maxRewardUsd" INTEGER NOT NULL,
    "triageSla" TEXT NOT NULL,
    "payoutWindow" TEXT NOT NULL,
    "examples" TEXT[],

    CONSTRAINT "reward_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scope_targets" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "reviewStatus" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "referenceKind" "ScopeReferenceKind",
    "referenceValue" TEXT,
    "referenceUrl" TEXT,
    "network" TEXT,
    "environment" "ScopeEnvironment",
    "tags" TEXT[],

    CONSTRAINT "scope_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triage_stages" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "automation" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "outputs" TEXT[],
    "humanGate" TEXT NOT NULL,

    CONSTRAINT "triage_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_sections" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "items" TEXT[],

    CONSTRAINT "policy_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_fields" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "evidence_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "humanId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "reporterId" TEXT,
    "reporterName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "target" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "proof" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    "source" "ReportSource" NOT NULL DEFAULT 'CROWD_REPORT',
    "route" TEXT NOT NULL DEFAULT 'Standard intake queue',
    "decisionOwner" TEXT,
    "rewardEstimateUsd" INTEGER,
    "responseSla" TEXT,
    "nextAction" TEXT,
    "note" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accentTone" TEXT NOT NULL DEFAULT 'mint',
    "logoMark" TEXT NOT NULL,
    "rank" INTEGER,
    "score" DOUBLE PRECISION,
    "minerName" TEXT,
    "validatorScore" DOUBLE PRECISION,
    "headline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "capabilities" TEXT[],
    "supportedTechnologies" TEXT[],
    "guardrails" TEXT[],
    "supportedSurfaces" "ProgramCategory"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_metrics" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "note" TEXT NOT NULL,

    CONSTRAINT "agent_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_tools" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "access" TEXT,
    "useCase" TEXT NOT NULL,

    CONSTRAINT "agent_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_stages" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "outputs" TEXT[],
    "humanGate" TEXT,

    CONSTRAINT "agent_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_output_fields" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "agent_output_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_executions" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "programId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT,
    "summary" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_agent_links" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "output" TEXT NOT NULL,

    CONSTRAINT "program_agent_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "programs_code_key" ON "programs"("code");

-- CreateIndex
CREATE UNIQUE INDEX "reward_tiers_programId_severity_key" ON "reward_tiers"("programId", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "reports_humanId_key" ON "reports"("humanId");

-- CreateIndex
CREATE INDEX "reports_programId_idx" ON "reports"("programId");

-- CreateIndex
CREATE INDEX "reports_reporterId_idx" ON "reports"("reporterId");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "program_agent_links_programId_agentId_key" ON "program_agent_links"("programId", "agentId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_tiers" ADD CONSTRAINT "reward_tiers_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scope_targets" ADD CONSTRAINT "scope_targets_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_stages" ADD CONSTRAINT "triage_stages_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_sections" ADD CONSTRAINT "policy_sections_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_fields" ADD CONSTRAINT "evidence_fields_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_metrics" ADD CONSTRAINT "agent_metrics_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tools" ADD CONSTRAINT "agent_tools_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_stages" ADD CONSTRAINT "agent_stages_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_output_fields" ADD CONSTRAINT "agent_output_fields_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_agent_links" ADD CONSTRAINT "program_agent_links_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_agent_links" ADD CONSTRAINT "program_agent_links_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
