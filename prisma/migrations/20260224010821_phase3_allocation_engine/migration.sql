/*
  Warnings:

  - The `status` column on the `HouseholdMember` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `BucketResponsibility` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('R2', 'S3');

-- CreateEnum
CREATE TYPE "AllocationMethod" AS ENUM ('EQUAL', 'ROOM_WEIGHTED', 'HYBRID');

-- CreateEnum
CREATE TYPE "RoomAssignmentRole" AS ENUM ('PRIMARY_BEDROOM', 'EXTRA_ROOM');

-- AlterTable
ALTER TABLE "BucketAttachment" ADD COLUMN     "objectKey" TEXT,
ADD COLUMN     "originalName" TEXT,
ADD COLUMN     "sha256Hex" TEXT,
ADD COLUMN     "storageProvider" "StorageProvider";

-- AlterTable
ALTER TABLE "BucketResponsibility" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "HouseholdMember" DROP COLUMN "status",
ADD COLUMN     "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lengthIn" INTEGER,
    "widthIn" INTEGER,
    "sqft" INTEGER,
    "hasPrivateBath" BOOLEAN NOT NULL DEFAULT false,
    "bathLengthIn" INTEGER,
    "bathWidthIn" INTEGER,
    "bathSqft" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomAssignment" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "householdMemberId" TEXT NOT NULL,
    "role" "RoomAssignmentRole" NOT NULL DEFAULT 'PRIMARY_BEDROOM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationPlan" (
    "id" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "method" "AllocationMethod" NOT NULL DEFAULT 'HYBRID',
    "equalShareBps" INTEGER NOT NULL DEFAULT 6000,
    "weightedShareBps" INTEGER NOT NULL DEFAULT 4000,
    "includePrivateBath" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllocationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Room_householdId_idx" ON "Room"("householdId");

-- CreateIndex
CREATE INDEX "RoomAssignment_roomId_idx" ON "RoomAssignment"("roomId");

-- CreateIndex
CREATE INDEX "RoomAssignment_householdMemberId_idx" ON "RoomAssignment"("householdMemberId");

-- CreateIndex
CREATE INDEX "RoomAssignment_role_idx" ON "RoomAssignment"("role");

-- CreateIndex
CREATE UNIQUE INDEX "RoomAssignment_roomId_householdMemberId_role_key" ON "RoomAssignment"("roomId", "householdMemberId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "AllocationPlan_bucketId_key" ON "AllocationPlan"("bucketId");

-- CreateIndex
CREATE INDEX "AllocationPlan_bucketId_idx" ON "AllocationPlan"("bucketId");

-- CreateIndex
CREATE INDEX "AllocationPlan_method_idx" ON "AllocationPlan"("method");

-- CreateIndex
CREATE INDEX "BucketAttachment_storageProvider_idx" ON "BucketAttachment"("storageProvider");

-- CreateIndex
CREATE INDEX "HouseholdMember_status_idx" ON "HouseholdMember"("status");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomAssignment" ADD CONSTRAINT "RoomAssignment_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomAssignment" ADD CONSTRAINT "RoomAssignment_householdMemberId_fkey" FOREIGN KEY ("householdMemberId") REFERENCES "HouseholdMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationPlan" ADD CONSTRAINT "AllocationPlan_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "Bucket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
