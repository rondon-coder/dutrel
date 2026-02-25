import { prisma } from '@/lib/prisma';
import { ERROR_CODES } from '@/lib/constants';

export async function requireBucketAccess(bucketId: string, userId: string) {
  const bucket = await prisma.bucket.findUnique({
    where: { id: bucketId },
    include: { household: { include: { members: true } } },
  });

  if (!bucket) throw new Error(ERROR_CODES.NOT_FOUND);

  const member = bucket.household.members.find((m) => m.userId === userId && m.status === 'ACTIVE');
  if (!member) throw new Error(ERROR_CODES.FORBIDDEN);

  return { bucket, member };
}

export async function requireHouseholdAccess(householdId: string, userId: string) {
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    include: { members: true },
  });

  if (!household) throw new Error(ERROR_CODES.NOT_FOUND);

  const member = household.members.find((m) => m.userId === userId && m.status === 'ACTIVE');
  if (!member) throw new Error(ERROR_CODES.FORBIDDEN);

  return { household, member };
}

/**
 * Bucket manager definition:
 * - PAYER / SECONDARY_PAYER can always manage
 * - INDIVIDUAL bucket owner can manage their own bucket
 */
export async function canManageBucket(userId: string, bucketId: string): Promise<boolean> {
  const { bucket, member } = await requireBucketAccess(bucketId, userId);

  if (member.role === 'PAYER' || member.role === 'SECONDARY_PAYER') return true;

  if (bucket.type === 'INDIVIDUAL' && bucket.ownerUserId === userId) return true;

  return false;
}