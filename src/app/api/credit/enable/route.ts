import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { canManageBucket, requireBucketAccess } from '@/lib/permissions';
import { ERROR_CODES } from '@/lib/constants';
import type { CreditReportingStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

type EnablePayload = {
  bucketId?: unknown;
};

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

/**
 * POST /api/credit/enable
 *
 * Model 2 enforcement:
 * - Bucket MUST be INDIVIDUAL
 * - Bucket MUST have autopayEnabledAt set
 * - UserIdentity MUST be VERIFIED
 * - User must be able to manage the bucket (coordinator or owner)
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const body: unknown = await req.json();
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.BAD_REQUEST, message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const bucketId = asString((body as EnablePayload).bucketId);
    if (!bucketId) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'bucketId is required' },
        { status: 400 }
      );
    }

    // Permission gate
    if (!(await canManageBucket(userId, bucketId))) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Not authorized to manage this bucket' },
        { status: 403 }
      );
    }

    const { bucket } = await requireBucketAccess(bucketId, userId);

    if (bucket.type !== 'INDIVIDUAL') {
      return NextResponse.json(
        {
          ok: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'Credit reporting can only be enabled for INDIVIDUAL buckets',
        },
        { status: 400 }
      );
    }

    if (!bucket.autopayEnabledAt) {
      return NextResponse.json(
        {
          ok: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'Autopay must be enabled before credit reporting can be activated',
        },
        { status: 400 }
      );
    }

    const identity = await prisma.userIdentity.findUnique({ where: { userId } });
    if (!identity || identity.status !== 'VERIFIED') {
      return NextResponse.json(
        {
          ok: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'Identity must be VERIFIED before enabling credit reporting',
        },
        { status: 400 }
      );
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.bucket.update({
        where: { id: bucketId },
        data: {
          creditReportingEnabled: true,
          creditReportingStatus: 'ACTIVE' as CreditReportingStatus,
          creditReportingActivatedAt: bucket.creditReportingActivatedAt ?? now,
          creditReportingPausedAt: null,
          creditReportingReason: null,
          // provider stays NONE until partner integration
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          creditReportingEnabled: true,
          creditReportingSince: now,
        },
      });

      await tx.actionLog.create({
        data: {
          householdId: bucket.householdId,
          actorUserId: userId,
          action: 'CREDIT_ENABLE',
          entityType: 'BUCKET',
          entityId: bucketId,
          metadataJson: JSON.stringify({
            creditReportingEnabled: true,
            creditReportingStatus: 'ACTIVE',
          }),
        },
      });

      return b;
    });

    return NextResponse.json({ ok: true, bucket: updated });
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