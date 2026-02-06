// src/lib/permissions.ts

import { prisma } from '@/lib/prisma';
import { HouseholdRole } from '@prisma/client';
import { ERROR_CODES } from '@/lib/constants';

/**
 * Permissions engine enforcing docs/PERMISSIONS_MATRIX.md
 */

export async function getHouseholdMember(householdId: string, userId: string) {
  return prisma.householdMember.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    include: {
      household: true,
    },
  });
}

export async function getBucket(bucketId: string) {
  return prisma.bucket.findUnique({
    where: { id: bucketId },
    include: { household: true },
  });
}

export async function getObligation(obligationId: string) {
  return prisma.obligation.findUnique({
    where: { id: obligationId },
    include: {
      bucket: {
        include: { household: true },
      },
    },
  });
}

export function isCoordinator(role: HouseholdRole): boolean {
  return role === 'PAYER' || role === 'SECONDARY_PAYER';
}

export function canManageGroupBuckets(role: HouseholdRole): boolean {
  return isCoordinator(role);
}

export function canManageIndividualBucket(
  userId: string,
  ownerUserId: string | null,
  role: HouseholdRole
): boolean {
  if (isCoordinator(role)) return true;
  return ownerUserId === userId;
}

export async function canManageBucket(userId: string, bucketId: string): Promise<boolean> {
  const bucket = await getBucket(bucketId);
  if (!bucket) return false;

  const member = await getHouseholdMember(bucket.householdId, userId);
  if (!member) return false;

  if (bucket.type === 'GROUP') {
    return canManageGroupBuckets(member.role);
  }
  return canManageIndividualBucket(userId, bucket.ownerUserId, member.role);
}

export async function canManageObligation(userId: string, obligationId: string): Promise<boolean> {
  const obligation = await getObligation(obligationId);
  if (!obligation) return false;

  return canManageBucket(userId, obligation.bucketId);
}

/**
 * Any household member can view an obligation.
 * NOTE: If obligation doesn't exist, returns false (caller can choose 403 vs 404 behavior).
 */
export async function canViewObligation(userId: string, obligationId: string): Promise<boolean> {
  const obligation = await getObligation(obligationId);
  if (!obligation) return false;

  const member = await getHouseholdMember(obligation.bucket.householdId, userId);
  return !!member;
}

export async function canVerifyReceipt(userId: string, obligationId: string): Promise<boolean> {
  return canManageObligation(userId, obligationId);
}

export async function requireHouseholdMember(householdId: string, userId: string) {
  const member = await getHouseholdMember(householdId, userId);
  if (!member) {
    throw new Error(ERROR_CODES.FORBIDDEN);
  }
  return member;
}

export async function requireBucketAccess(bucketId: string, userId: string) {
  const bucket = await getBucket(bucketId);
  if (!bucket) {
    throw new Error(ERROR_CODES.NOT_FOUND);
  }
  const member = await requireHouseholdMember(bucket.householdId, userId);
  return { bucket, member };
}

export async function requireObligationView(obligationId: string, userId: string) {
  const obligation = await getObligation(obligationId);
  if (!obligation) {
    throw new Error(ERROR_CODES.NOT_FOUND);
  }

  const member = await getHouseholdMember(obligation.bucket.householdId, userId);
  if (!member) {
    throw new Error(ERROR_CODES.FORBIDDEN);
  }

  return { obligation, member };
}
