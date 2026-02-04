-- CreateEnum
CREATE TYPE "HouseholdRole" AS ENUM ('MEMBER', 'PAYER', 'SECONDARY_PAYER');

-- CreateEnum
CREATE TYPE "BucketType" AS ENUM ('GROUP', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "BucketVariability" AS ENUM ('FIXED', 'VARIABLE');

-- CreateEnum
CREATE TYPE "BucketCadence" AS ENUM ('MONTHLY', 'QUARTERLY', 'OTHER');

-- CreateEnum
CREATE TYPE "ObligationStatus" AS ENUM ('OPEN', 'CLOSED', 'DISPUTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('MEMBER_SUBMITTED', 'PENDING_PAYER_REVIEW', 'VERIFIED', 'DISPUTED', 'AUTO_CLOSED_TIMEOUT', 'ESCALATED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdMember" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "HouseholdRole" NOT NULL DEFAULT 'MEMBER',
    "successionRank" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseholdMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bucket" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "type" "BucketType" NOT NULL,
    "name" TEXT NOT NULL,
    "cadence" "BucketCadence" NOT NULL DEFAULT 'MONTHLY',
    "variability" "BucketVariability" NOT NULL DEFAULT 'VARIABLE',
    "ownerUserId" TEXT,
    "autopayEnabledAt" TIMESTAMP(3),
    "notificationPauseUntil" TIMESTAMP(3),
    "bufferTargetCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BucketMember" (
    "id" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "householdMemberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BucketMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Obligation" (
    "id" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "status" "ObligationStatus" NOT NULL DEFAULT 'OPEN',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "closedAt" TIMESTAMP(3),
    "closedByUserId" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "reopenedByUserId" TEXT,
    "reopenReason" TEXT,
    "isRecoveryMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Obligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'PENDING_PAYER_REVIEW',
    "uploadedByUserId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "disputeReason" TEXT,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "HouseholdMember_householdId_idx" ON "HouseholdMember"("householdId");

-- CreateIndex
CREATE INDEX "HouseholdMember_userId_idx" ON "HouseholdMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdMember_householdId_userId_key" ON "HouseholdMember"("householdId", "userId");

-- CreateIndex
CREATE INDEX "Bucket_householdId_idx" ON "Bucket"("householdId");

-- CreateIndex
CREATE INDEX "Bucket_ownerUserId_idx" ON "Bucket"("ownerUserId");

-- CreateIndex
CREATE INDEX "BucketMember_bucketId_idx" ON "BucketMember"("bucketId");

-- CreateIndex
CREATE INDEX "BucketMember_householdMemberId_idx" ON "BucketMember"("householdMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "BucketMember_bucketId_householdMemberId_key" ON "BucketMember"("bucketId", "householdMemberId");

-- CreateIndex
CREATE INDEX "Obligation_bucketId_idx" ON "Obligation"("bucketId");

-- CreateIndex
CREATE INDEX "Obligation_status_idx" ON "Obligation"("status");

-- CreateIndex
CREATE INDEX "Obligation_dueDate_idx" ON "Obligation"("dueDate");

-- CreateIndex
CREATE INDEX "Receipt_obligationId_idx" ON "Receipt"("obligationId");

-- CreateIndex
CREATE INDEX "Receipt_status_idx" ON "Receipt"("status");

-- AddForeignKey
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bucket" ADD CONSTRAINT "Bucket_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BucketMember" ADD CONSTRAINT "BucketMember_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "Bucket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BucketMember" ADD CONSTRAINT "BucketMember_householdMemberId_fkey" FOREIGN KEY ("householdMemberId") REFERENCES "HouseholdMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obligation" ADD CONSTRAINT "Obligation_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "Bucket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "Obligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
