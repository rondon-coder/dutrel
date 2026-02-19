-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INVITED', 'LEFT', 'REMOVED');

-- CreateEnum
CREATE TYPE "HouseholdKind" AS ENUM ('ROOMMATES', 'PROPERTY');

-- CreateEnum
CREATE TYPE "BankConnectionStatus" AS ENUM ('ACTIVE', 'DISCONNECTED', 'ERROR');

-- AlterEnum
ALTER TYPE "PaymentPartner" ADD VALUE 'PLAID';

-- AlterTable
ALTER TABLE "Bucket" ADD COLUMN     "creditReportingActivatedAt" TIMESTAMP(3),
ADD COLUMN     "creditReportingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "creditReportingPausedAt" TIMESTAMP(3),
ADD COLUMN     "creditReportingProvider" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "creditReportingReason" TEXT,
ADD COLUMN     "creditReportingStatus" TEXT NOT NULL DEFAULT 'INACTIVE';

-- AlterTable
ALTER TABLE "Household" ADD COLUMN     "kind" "HouseholdKind" NOT NULL DEFAULT 'ROOMMATES';

-- CreateTable
CREATE TABLE "BankConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partner" "PaymentPartner" NOT NULL DEFAULT 'NONE',
    "status" "BankConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "plaidItemId" TEXT,
    "accessTokenEnc" TEXT,
    "institutionName" TEXT,
    "institutionId" TEXT,
    "label" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "plaidAccountId" TEXT,
    "name" TEXT,
    "officialName" TEXT,
    "maskLast4" TEXT,
    "type" TEXT,
    "subtype" TEXT,
    "isBillAccount" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceSnapshot" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "availableCents" INTEGER,
    "currentCents" INTEGER,
    "asOf" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMatch" (
    "id" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "partner" "PaymentPartner" NOT NULL DEFAULT 'NONE',
    "partnerTxnId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "postedAt" TIMESTAMP(3),
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'MATCHED',
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankConnection_plaidItemId_key" ON "BankConnection"("plaidItemId");

-- CreateIndex
CREATE INDEX "BankConnection_userId_idx" ON "BankConnection"("userId");

-- CreateIndex
CREATE INDEX "BankConnection_status_idx" ON "BankConnection"("status");

-- CreateIndex
CREATE INDEX "BankConnection_partner_idx" ON "BankConnection"("partner");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_plaidAccountId_key" ON "BankAccount"("plaidAccountId");

-- CreateIndex
CREATE INDEX "BankAccount_connectionId_idx" ON "BankAccount"("connectionId");

-- CreateIndex
CREATE INDEX "BankAccount_isBillAccount_idx" ON "BankAccount"("isBillAccount");

-- CreateIndex
CREATE INDEX "BalanceSnapshot_bankAccountId_idx" ON "BalanceSnapshot"("bankAccountId");

-- CreateIndex
CREATE INDEX "BalanceSnapshot_asOf_idx" ON "BalanceSnapshot"("asOf");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMatch_partnerTxnId_key" ON "PaymentMatch"("partnerTxnId");

-- CreateIndex
CREATE INDEX "PaymentMatch_obligationId_idx" ON "PaymentMatch"("obligationId");

-- CreateIndex
CREATE INDEX "PaymentMatch_bankAccountId_idx" ON "PaymentMatch"("bankAccountId");

-- CreateIndex
CREATE INDEX "PaymentMatch_partner_idx" ON "PaymentMatch"("partner");

-- CreateIndex
CREATE INDEX "Bucket_creditReportingEnabled_idx" ON "Bucket"("creditReportingEnabled");

-- CreateIndex
CREATE INDEX "BucketAttachment_createdByUserId_idx" ON "BucketAttachment"("createdByUserId");

-- CreateIndex
CREATE INDEX "BucketMember_householdMemberId_idx" ON "BucketMember"("householdMemberId");

-- CreateIndex
CREATE INDEX "HouseholdMember_status_idx" ON "HouseholdMember"("status");

-- CreateIndex
CREATE INDEX "Obligation_closedByUserId_idx" ON "Obligation"("closedByUserId");

-- CreateIndex
CREATE INDEX "Receipt_uploadedByUserId_idx" ON "Receipt"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "Receipt_reviewedByUserId_idx" ON "Receipt"("reviewedByUserId");

-- AddForeignKey
ALTER TABLE "BankConnection" ADD CONSTRAINT "BankConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BankConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceSnapshot" ADD CONSTRAINT "BalanceSnapshot_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMatch" ADD CONSTRAINT "PaymentMatch_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "Obligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMatch" ADD CONSTRAINT "PaymentMatch_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
