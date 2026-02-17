-- CreateEnum
CREATE TYPE "ObligationCategory" AS ENUM ('RENT', 'UTILITY', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentPartner" AS ENUM ('NONE', 'UNIT', 'DWOLLA', 'STRIPE_TREASURY', 'OTHER');

-- CreateEnum
CREATE TYPE "FundingMode" AS ENUM ('INTERNAL', 'VIRTUAL_ACCOUNT');

-- CreateEnum
CREATE TYPE "VirtualAccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FundingSourceStatus" AS ENUM ('PENDING', 'VERIFIED', 'DISABLED');

-- CreateEnum
CREATE TYPE "IdentityStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('MANUAL', 'SELFIE_ID', 'KBA', 'OTHER');

-- CreateEnum
CREATE TYPE "CreditReportingStatus" AS ENUM ('DISABLED', 'ELIGIBLE', 'ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "ReportingState" AS ENUM ('NOT_ELIGIBLE', 'ELIGIBLE', 'QUEUED', 'REPORTED', 'SKIPPED', 'ERROR');

-- CreateEnum
CREATE TYPE "CreditReportProvider" AS ENUM ('NONE', 'EXPERIAN', 'EQUIFAX', 'TRANSUNION', 'PLAID_CRA', 'OTHER');

-- CreateEnum
CREATE TYPE "CreditReportBatchStatus" AS ENUM ('DRAFT', 'READY', 'SUBMITTED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CreditReportItemStatus" AS ENUM ('QUEUED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "PaymentEventType" AS ENUM ('ON_TIME_PAYMENT');

-- AlterTable
ALTER TABLE "Bucket" ADD COLUMN     "creditReportingActivatedAt" TIMESTAMP(3),
ADD COLUMN     "creditReportingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "creditReportingPausedAt" TIMESTAMP(3),
ADD COLUMN     "creditReportingProvider" "CreditReportProvider" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "creditReportingReason" TEXT,
ADD COLUMN     "creditReportingStatus" "CreditReportingStatus" NOT NULL DEFAULT 'DISABLED',
ADD COLUMN     "fundingMode" "FundingMode" NOT NULL DEFAULT 'INTERNAL';

-- AlterTable
ALTER TABLE "Obligation" ADD COLUMN     "category" "ObligationCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "reportedAt" TIMESTAMP(3),
ADD COLUMN     "reportingEligibleAt" TIMESTAMP(3),
ADD COLUMN     "reportingError" TEXT,
ADD COLUMN     "reportingProviderRef" TEXT,
ADD COLUMN     "reportingQueuedAt" TIMESTAMP(3),
ADD COLUMN     "reportingState" "ReportingState" NOT NULL DEFAULT 'NOT_ELIGIBLE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "autopayEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autopayExternalNickname" TEXT,
ADD COLUMN     "autopayLastConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "creditReportingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "creditReportingSince" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "IdentityStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "method" "VerificationMethod",
    "legalFullName" TEXT,
    "dob" TIMESTAMP(3),
    "phoneE164" TEXT,
    "ssnLast4" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'US',
    "verifiedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditReportBatch" (
    "id" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "provider" "CreditReportProvider" NOT NULL DEFAULT 'NONE',
    "status" "CreditReportBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "providerBatchId" TEXT,
    "metadataJson" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditReportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditReportItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "CreditReportItemStatus" NOT NULL DEFAULT 'QUEUED',
    "eventType" "PaymentEventType" NOT NULL DEFAULT 'ON_TIME_PAYMENT',
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "providerItemId" TEXT,
    "providerResponseJson" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditReportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partner" "PaymentPartner" NOT NULL DEFAULT 'NONE',
    "status" "FundingSourceStatus" NOT NULL DEFAULT 'PENDING',
    "label" TEXT,
    "bankName" TEXT,
    "last4" TEXT,
    "accountType" TEXT,
    "providerToken" TEXT,
    "providerRefId" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundingSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VirtualAccount" (
    "id" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "partner" "PaymentPartner" NOT NULL DEFAULT 'NONE',
    "status" "VirtualAccountStatus" NOT NULL DEFAULT 'PENDING',
    "nickname" TEXT,
    "bankName" TEXT,
    "routingLast4" TEXT,
    "accountLast4" TEXT,
    "providerAccountId" TEXT,
    "providerCustomerId" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VirtualAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserIdentity_userId_key" ON "UserIdentity"("userId");

-- CreateIndex
CREATE INDEX "UserIdentity_status_idx" ON "UserIdentity"("status");

-- CreateIndex
CREATE INDEX "UserIdentity_verifiedAt_idx" ON "UserIdentity"("verifiedAt");

-- CreateIndex
CREATE INDEX "CreditReportBatch_bucketId_idx" ON "CreditReportBatch"("bucketId");

-- CreateIndex
CREATE INDEX "CreditReportBatch_householdId_idx" ON "CreditReportBatch"("householdId");

-- CreateIndex
CREATE INDEX "CreditReportBatch_status_idx" ON "CreditReportBatch"("status");

-- CreateIndex
CREATE INDEX "CreditReportBatch_provider_idx" ON "CreditReportBatch"("provider");

-- CreateIndex
CREATE INDEX "CreditReportItem_batchId_idx" ON "CreditReportItem"("batchId");

-- CreateIndex
CREATE INDEX "CreditReportItem_obligationId_idx" ON "CreditReportItem"("obligationId");

-- CreateIndex
CREATE INDEX "CreditReportItem_userId_idx" ON "CreditReportItem"("userId");

-- CreateIndex
CREATE INDEX "CreditReportItem_status_idx" ON "CreditReportItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CreditReportItem_batchId_obligationId_key" ON "CreditReportItem"("batchId", "obligationId");

-- CreateIndex
CREATE INDEX "FundingSource_userId_idx" ON "FundingSource"("userId");

-- CreateIndex
CREATE INDEX "FundingSource_partner_idx" ON "FundingSource"("partner");

-- CreateIndex
CREATE INDEX "FundingSource_status_idx" ON "FundingSource"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FundingSource_partner_providerRefId_key" ON "FundingSource"("partner", "providerRefId");

-- CreateIndex
CREATE INDEX "VirtualAccount_bucketId_idx" ON "VirtualAccount"("bucketId");

-- CreateIndex
CREATE INDEX "VirtualAccount_partner_idx" ON "VirtualAccount"("partner");

-- CreateIndex
CREATE INDEX "VirtualAccount_status_idx" ON "VirtualAccount"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VirtualAccount_partner_providerAccountId_key" ON "VirtualAccount"("partner", "providerAccountId");

-- CreateIndex
CREATE INDEX "Bucket_fundingMode_idx" ON "Bucket"("fundingMode");

-- CreateIndex
CREATE INDEX "Bucket_creditReportingEnabled_idx" ON "Bucket"("creditReportingEnabled");

-- CreateIndex
CREATE INDEX "Bucket_creditReportingStatus_idx" ON "Bucket"("creditReportingStatus");

-- CreateIndex
CREATE INDEX "Obligation_category_idx" ON "Obligation"("category");

-- CreateIndex
CREATE INDEX "Obligation_reportingState_idx" ON "Obligation"("reportingState");

-- CreateIndex
CREATE INDEX "User_autopayEnabled_idx" ON "User"("autopayEnabled");

-- CreateIndex
CREATE INDEX "User_creditReportingEnabled_idx" ON "User"("creditReportingEnabled");

-- AddForeignKey
ALTER TABLE "UserIdentity" ADD CONSTRAINT "UserIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditReportBatch" ADD CONSTRAINT "CreditReportBatch_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "Bucket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditReportItem" ADD CONSTRAINT "CreditReportItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "CreditReportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditReportItem" ADD CONSTRAINT "CreditReportItem_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "Obligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditReportItem" ADD CONSTRAINT "CreditReportItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingSource" ADD CONSTRAINT "FundingSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VirtualAccount" ADD CONSTRAINT "VirtualAccount_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "Bucket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
