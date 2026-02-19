/*
  Warnings:

  - You are about to drop the column `creditReportingActivatedAt` on the `Bucket` table. All the data in the column will be lost.
  - You are about to drop the column `creditReportingEnabled` on the `Bucket` table. All the data in the column will be lost.
  - You are about to drop the column `creditReportingPausedAt` on the `Bucket` table. All the data in the column will be lost.
  - You are about to drop the column `creditReportingProvider` on the `Bucket` table. All the data in the column will be lost.
  - You are about to drop the column `creditReportingReason` on the `Bucket` table. All the data in the column will be lost.
  - You are about to drop the column `creditReportingStatus` on the `Bucket` table. All the data in the column will be lost.
  - You are about to drop the column `reportedAt` on the `Obligation` table. All the data in the column will be lost.
  - You are about to drop the column `reportingEligibleAt` on the `Obligation` table. All the data in the column will be lost.
  - You are about to drop the column `reportingError` on the `Obligation` table. All the data in the column will be lost.
  - You are about to drop the column `reportingProviderRef` on the `Obligation` table. All the data in the column will be lost.
  - You are about to drop the column `reportingQueuedAt` on the `Obligation` table. All the data in the column will be lost.
  - You are about to drop the column `reportingState` on the `Obligation` table. All the data in the column will be lost.
  - You are about to drop the `CreditReportBatch` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CreditReportItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserIdentity` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('FILE', 'LINK', 'NOTE');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('LEASE', 'HOA', 'VENDOR', 'INVOICE', 'RECEIPT', 'OTHER');

-- DropForeignKey
ALTER TABLE "CreditReportBatch" DROP CONSTRAINT "CreditReportBatch_bucketId_fkey";

-- DropForeignKey
ALTER TABLE "CreditReportItem" DROP CONSTRAINT "CreditReportItem_batchId_fkey";

-- DropForeignKey
ALTER TABLE "CreditReportItem" DROP CONSTRAINT "CreditReportItem_obligationId_fkey";

-- DropForeignKey
ALTER TABLE "CreditReportItem" DROP CONSTRAINT "CreditReportItem_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserIdentity" DROP CONSTRAINT "UserIdentity_userId_fkey";

-- DropIndex
DROP INDEX "Bucket_creditReportingEnabled_idx";

-- DropIndex
DROP INDEX "Bucket_creditReportingStatus_idx";

-- DropIndex
DROP INDEX "BucketMember_householdMemberId_idx";

-- DropIndex
DROP INDEX "Obligation_reportingState_idx";

-- AlterTable
ALTER TABLE "Bucket" DROP COLUMN "creditReportingActivatedAt",
DROP COLUMN "creditReportingEnabled",
DROP COLUMN "creditReportingPausedAt",
DROP COLUMN "creditReportingProvider",
DROP COLUMN "creditReportingReason",
DROP COLUMN "creditReportingStatus";

-- AlterTable
ALTER TABLE "Obligation" DROP COLUMN "reportedAt",
DROP COLUMN "reportingEligibleAt",
DROP COLUMN "reportingError",
DROP COLUMN "reportingProviderRef",
DROP COLUMN "reportingQueuedAt",
DROP COLUMN "reportingState";

-- DropTable
DROP TABLE "CreditReportBatch";

-- DropTable
DROP TABLE "CreditReportItem";

-- DropTable
DROP TABLE "UserIdentity";

-- DropEnum
DROP TYPE "CreditReportBatchStatus";

-- DropEnum
DROP TYPE "CreditReportItemStatus";

-- DropEnum
DROP TYPE "CreditReportProvider";

-- DropEnum
DROP TYPE "CreditReportingStatus";

-- DropEnum
DROP TYPE "IdentityStatus";

-- DropEnum
DROP TYPE "PaymentEventType";

-- DropEnum
DROP TYPE "ReportingState";

-- DropEnum
DROP TYPE "VerificationMethod";

-- CreateTable
CREATE TABLE "BucketAttachment" (
    "id" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "kind" "AttachmentKind" NOT NULL,
    "type" "AttachmentType" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "pinnedToHousehold" BOOLEAN NOT NULL DEFAULT false,
    "fileUrl" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "url" TEXT,
    "noteText" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BucketAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BucketAttachment_bucketId_idx" ON "BucketAttachment"("bucketId");

-- CreateIndex
CREATE INDEX "BucketAttachment_pinnedToHousehold_idx" ON "BucketAttachment"("pinnedToHousehold");

-- CreateIndex
CREATE INDEX "BucketAttachment_createdAt_idx" ON "BucketAttachment"("createdAt");

-- AddForeignKey
ALTER TABLE "BucketAttachment" ADD CONSTRAINT "BucketAttachment_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "Bucket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BucketAttachment" ADD CONSTRAINT "BucketAttachment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
