import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { requireHouseholdMember } from '@/lib/permissions';
import { ERROR_CODES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * GET /api/households/[householdId]/attachments/pinned
 * Authorization: Any household member
 *
 * Returns pinned attachments across all buckets in the household.
 * (Access rule: if you are a household member, you can see household pinned items.)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ householdId: string }> }
) {
  try {
    const { householdId } = await params;
    const { userId } = await requireAuth();

    await requireHouseholdMember(householdId, userId);

    const pinned = await prisma.bucketAttachment.findMany({
      where: {
        pinnedToHousehold: true,
        bucket: {
          householdId,
        },
      },
      include: {
        bucket: {
          select: {
            id: true,
            name: true,
            type: true,
            householdId: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return NextResponse.json({ ok: true, pinned });
  } catch (error) {
    if (error instanceof Error && error.message === ERROR_CODES.FORBIDDEN) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Access denied' },
        { status: 403 }
      );
    }
    if (error instanceof Error && error.message === ERROR_CODES.UNAUTHORIZED) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { ok: false, error: ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
