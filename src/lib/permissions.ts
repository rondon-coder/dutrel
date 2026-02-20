import { prisma } from '@/lib/prisma';
import { ERROR_CODES } from '@/lib/constants';

async function getHouseholdMember(householdId: string, userId: string) {
  return prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId, userId } },
  });
}

async function getBucket(bucketId: string) {
  return prisma.bucket.findUnique({
    where: { id: bucketId },
    include: {
      household: true,
      members: { select: { householdMemberId: true } },
      responsibleMembers: { select: { householdMemberId: true, role: true } },
    },
  });
}

export async function requireAuthUserIdFromHeader(req: Request) {
  const userId = req.headers.get('x-user-id');
  if (!userId) throw new Error(ERROR_CODES.UNAUTHORIZED);
  return userId;
}

export async function requireHouseholdAccess(householdId: string, userId: string) {
  const member = await getHouseholdMember(householdId, userId);
  if (!member) throw new Error(ERROR_CODES.FORBIDDEN);
  return member;
}

/**
 * Bucket READ access:
 * - Must be household member
 * - PAYER/SECONDARY_PAYER can access any bucket
 * - INDIVIDUAL owner can access their bucket
 * - Otherwise must be an explicit BucketMember
 */
export async function requireBucketAccess(bucketId: string, userId: string) {
  const bucket = await getBucket(bucketId);
  if (!bucket) throw new Error(ERROR_CODES.NOT_FOUND);

  const member = await prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId: bucket.householdId, userId } },
  });
  if (!member) throw new Error(ERROR_CODES.FORBIDDEN);

  if (member.role === 'PAYER' || member.role === 'SECONDARY_PAYER') {
    return { bucket, member };
  }

  if (bucket.type === 'INDIVIDUAL' && bucket.ownerUserId === userId) {
    return { bucket, member };
  }

  const isBucketMember = bucket.members.some((m) => m.householdMemberId === member.id);
  if (!isBucketMember) throw new Error(ERROR_CODES.FORBIDDEN);

  return { bucket, member };
}

/**
 * Bucket MANAGE access:
 * - PAYER/SECONDARY_PAYER always manage
 * - INDIVIDUAL owner manages their bucket
 * - BucketResponsibility (any role) can manage that bucket
 */
export async function canManageBucket(userId: string, bucketId: string) {
  const bucket = await getBucket(bucketId);
  if (!bucket) return false;

  const member = await prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId: bucket.householdId, userId } },
  });
  if (!member) return false;

  if (member.role === 'PAYER' || member.role === 'SECONDARY_PAYER') return true;
  if (bucket.type === 'INDIVIDUAL' && bucket.ownerUserId === userId) return true;

  const responsibility = await prisma.bucketResponsibility.findFirst({
    where: { bucketId, householdMemberId: member.id },
  });
  if (responsibility) return true;

  return false;
}