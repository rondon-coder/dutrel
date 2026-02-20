-- CreateEnum
CREATE TYPE "BucketResponsibilityRole" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateTable
CREATE TABLE "BucketResponsibility" (
    "id" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "householdMemberId" TEXT NOT NULL,
    "role" "BucketResponsibilityRole" NOT NULL DEFAULT 'PRIMARY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BucketResponsibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BucketResponsibility_bucketId_idx" ON "BucketResponsibility"("bucketId");

-- CreateIndex
CREATE INDEX "BucketResponsibility_householdMemberId_idx" ON "BucketResponsibility"("householdMemberId");

-- CreateIndex
CREATE INDEX "BucketResponsibility_role_idx" ON "BucketResponsibility"("role");

-- CreateIndex
CREATE UNIQUE INDEX "BucketResponsibility_bucketId_householdMemberId_key" ON "BucketResponsibility"("bucketId", "householdMemberId");

-- AddForeignKey
ALTER TABLE "BucketResponsibility" ADD CONSTRAINT "BucketResponsibility_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "Bucket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BucketResponsibility" ADD CONSTRAINT "BucketResponsibility_householdMemberId_fkey" FOREIGN KEY ("householdMemberId") REFERENCES "HouseholdMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
