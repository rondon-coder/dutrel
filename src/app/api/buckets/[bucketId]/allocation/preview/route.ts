import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { requireBucketAccess, canManageBucket } from '@/lib/permissions';
import { ERROR_CODES } from '@/lib/constants';
import { computeAllocation } from '@/lib/allocation/engine';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bucketId: string }> }
) {
  try {
    const { bucketId } = await params;
    const { userId } = await requireAuth();

    await requireBucketAccess(bucketId, userId);

    // Only managers can preview allocation for now (keeps Phase 3 safe).
    if (!(await canManageBucket(userId, bucketId))) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Not authorized' },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const amountCentsStr = url.searchParams.get('amountCents');
    const amountCents = amountCentsStr ? Number(amountCentsStr) : NaN;

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'amountCents must be a positive number' },
        { status: 400 }
      );
    }

    const bucket = await prisma.bucket.findUnique({
      where: { id: bucketId },
      include: {
        household: {
          include: {
            members: {
              include: { user: true },
            },
            rooms: {
              include: {
                assignments: true,
              },
            },
          },
        },
        allocationPlan: true,
      },
    });

    if (!bucket) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.NOT_FOUND, message: 'Bucket not found' },
        { status: 404 }
      );
    }

    const plan = bucket.allocationPlan ?? {
      method: 'HYBRID',
      equalShareBps: 6000,
      weightedShareBps: 4000,
      includePrivateBath: true,
    };

    const members = bucket.household.members
      .filter((m) => m.status === 'ACTIVE')
      .map((m) => ({
        householdMemberId: m.id,
        displayName: m.user.email,
      }));

    // build weights from PRIMARY_BEDROOM assignments
    const weights = members.map((m) => {
      const room = bucket.household.rooms.find((r) =>
        r.assignments.some((a) => a.householdMemberId === m.householdMemberId && a.role === 'PRIMARY_BEDROOM')
      );

      const bedroomSqft = room?.sqft ?? 0;
      const privateBathSqft = room?.hasPrivateBath ? (room?.bathSqft ?? 0) : 0;

      return {
        householdMemberId: m.householdMemberId,
        bedroomSqft,
        privateBathSqft,
      };
    });

    const result = computeAllocation({
      amountCents: Math.trunc(amountCents),
      members,
      weights,
      plan: {
        method: plan.method,
        equalShareBps: plan.equalShareBps,
        weightedShareBps: plan.weightedShareBps,
        includePrivateBath: plan.includePrivateBath,
      },
    });

    return NextResponse.json({ ok: true, preview: result });
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
    if (error instanceof Error && error.message === ERROR_CODES.NOT_FOUND) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.NOT_FOUND, message: 'Not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, error: ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' },
      { status: 500 }
    );
  }
}