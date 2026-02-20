// src/app/api/buckets/[bucketId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { canManageBucket, requireBucketAccess } from '@/lib/permissions';
import { ERROR_CODES } from '@/lib/constants';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

type PatchBody = {
  name?: string;
  cadence?: 'MONTHLY' | 'QUARTERLY' | 'OTHER';
  variability?: 'FIXED' | 'VARIABLE';
  bufferTargetCents?: number;
  notificationPauseUntil?: string | null; // ISO
  memberHouseholdMemberIds?: string[]; // GROUP bucket membership override (subset)
};

/**
 * GET /api/buckets/[bucketId]
 * Authorization: any bucket member (or any household member if your requireBucketAccess is household-scoped).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bucketId: string }> }
) {
  try {
    const { bucketId } = await params;
    const { userId } = await requireAuth();

    // Ensures bucket exists + user is allowed to see it (household member).
    await requireBucketAccess(bucketId, userId);

    const bucket = await prisma.bucket.findUnique({
      where: { id: bucketId },
      include: {
        members: {
          include: {
            householdMember: { include: { user: { select: { id: true, email: true } } } },
          },
        },
        obligations: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!bucket) {
      return NextResponse.json({ ok: false, error: ERROR_CODES.NOT_FOUND, message: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, bucket });
  } catch (error) {
    if (error instanceof Error && error.message === ERROR_CODES.FORBIDDEN) {
      return NextResponse.json({ ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Access denied' }, { status: 403 });
    }
    if (error instanceof Error && error.message === ERROR_CODES.UNAUTHORIZED) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' },
        { status: 401 }
      );
    }
    if (error instanceof Error && error.message === ERROR_CODES.NOT_FOUND) {
      return NextResponse.json({ ok: false, error: ERROR_CODES.NOT_FOUND, message: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(
      { ok: false, error: ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/buckets/[bucketId]
 * Authorization: coordinator OR INDIVIDUAL bucket owner (via canManageBucket).
 *
 * Supports membership updates for GROUP buckets via memberHouseholdMemberIds:
 * - Lets you create “subset buckets” like Internet shared by 2 of 4 roommates.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bucketId: string }> }
) {
  try {
    const { bucketId } = await params;
    const { userId } = await requireAuth();
    const body = (await req.json()) as PatchBody;

    if (!(await canManageBucket(userId, bucketId))) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Not authorized to manage this bucket' },
        { status: 403 }
      );
    }

    // Ensure bucket exists + user is household member
    await requireBucketAccess(bucketId, userId);

    const existing = await prisma.bucket.findUnique({
      where: { id: bucketId },
      select: { id: true, householdId: true, type: true },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: ERROR_CODES.NOT_FOUND, message: 'Not found' }, { status: 404 });
    }

    const data: Prisma.BucketUpdateInput = {};

    if (typeof body.name === 'string') {
      const n = body.name.trim();
      if (!n) {
        return NextResponse.json(
          { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'name cannot be empty' },
          { status: 400 }
        );
      }
      data.name = n;
    }

    if (body.cadence) data.cadence = body.cadence;
    if (body.variability) data.variability = body.variability;

    if (typeof body.bufferTargetCents === 'number') {
      if (!Number.isFinite(body.bufferTargetCents) || body.bufferTargetCents < 0) {
        return NextResponse.json(
          { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'bufferTargetCents must be >= 0' },
          { status: 400 }
        );
      }
      data.bufferTargetCents = Math.floor(body.bufferTargetCents);
    }

    if (body.notificationPauseUntil !== undefined) {
      if (body.notificationPauseUntil === null) {
        data.notificationPauseUntil = null;
      } else {
        const dt = new Date(body.notificationPauseUntil);
        if (Number.isNaN(dt.getTime())) {
          return NextResponse.json(
            { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'notificationPauseUntil must be ISO date or null' },
            { status: 400 }
          );
        }
        data.notificationPauseUntil = dt;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const bucket = await tx.bucket.update({
        where: { id: bucketId },
        data,
      });

      // Membership updates only make sense on GROUP buckets
      if (existing.type === 'GROUP' && Array.isArray(body.memberHouseholdMemberIds)) {
        // Validate: these members belong to the same household
        const rows = await tx.householdMember.findMany({
          where: {
            householdId: existing.householdId,
            id: { in: body.memberHouseholdMemberIds },
          },
          select: { id: true },
        });

        const validIds = rows.map((r) => r.id);
        if (validIds.length === 0) {
          throw new Error(ERROR_CODES.VALIDATION_ERROR);
        }

        // Replace membership set
        await tx.bucketMember.deleteMany({ where: { bucketId } });
        await tx.bucketMember.createMany({
          data: validIds.map((hmId) => ({ bucketId, householdMemberId: hmId })),
        });
      }

      return bucket;
    });

    await prisma.actionLog.create({
      data: {
        householdId: existing.householdId,
        actorUserId: userId,
        action: 'BUCKET_UPDATE',
        entityType: 'BUCKET',
        entityId: bucketId,
        metadataJson: JSON.stringify({ bucketId, changes: body }),
      },
    });

    const bucketFull = await prisma.bucket.findUnique({
      where: { id: bucketId },
      include: {
        members: {
          include: {
            householdMember: { include: { user: { select: { id: true, email: true } } } },
          },
        },
      },
    });

    return NextResponse.json({ ok: true, bucket: bucketFull ?? updated });
  } catch (error) {
    if (error instanceof Error && error.message === ERROR_CODES.VALIDATION_ERROR) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid request' },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === ERROR_CODES.FORBIDDEN) {
      return NextResponse.json({ ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Access denied' }, { status: 403 });
    }
    if (error instanceof Error && error.message === ERROR_CODES.UNAUTHORIZED) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' },
        { status: 401 }
      );
    }
    if (error instanceof Error && error.message === ERROR_CODES.NOT_FOUND) {
      return NextResponse.json({ ok: false, error: ERROR_CODES.NOT_FOUND, message: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(
      { ok: false, error: ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/buckets/[bucketId]
 * Authorization: coordinator OR INDIVIDUAL bucket owner (via canManageBucket).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ bucketId: string }> }
) {
  try {
    const { bucketId } = await params;
    const { userId } = await requireAuth();

    if (!(await canManageBucket(userId, bucketId))) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Not authorized to manage this bucket' },
        { status: 403 }
      );
    }

    const bucket = await prisma.bucket.findUnique({
      where: { id: bucketId },
      select: { id: true, householdId: true },
    });

    if (!bucket) {
      return NextResponse.json({ ok: false, error: ERROR_CODES.NOT_FOUND, message: 'Not found' }, { status: 404 });
    }

    await prisma.bucket.delete({ where: { id: bucketId } });

    await prisma.actionLog.create({
      data: {
        householdId: bucket.householdId,
        actorUserId: userId,
        action: 'BUCKET_DELETE',
        entityType: 'BUCKET',
        entityId: bucketId,
        metadataJson: JSON.stringify({ bucketId }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === ERROR_CODES.FORBIDDEN) {
      return NextResponse.json({ ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Access denied' }, { status: 403 });
    }
    if (error instanceof Error && error.message === ERROR_CODES.UNAUTHORIZED) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' },
        { status: 401 }
      );
    }
    if (error instanceof Error && error.message === ERROR_CODES.NOT_FOUND) {
      return NextResponse.json({ ok: false, error: ERROR_CODES.NOT_FOUND, message: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(
      { ok: false, error: ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' },
      { status: 500 }
    );
  }
}