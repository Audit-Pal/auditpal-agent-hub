ALTER TABLE "users"
ADD COLUMN "walletAddress" TEXT,
ADD COLUMN "escrowContractAddress" TEXT;

ALTER TABLE "agents"
ADD COLUMN "walletAddress" TEXT;
