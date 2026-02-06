import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { requireBucketAccess, canManageBucket } from '@/lib/permissions';
import { ERROR_CODES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * GET /api/obligations?bucketId=xxx - List obligations for a bucket
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { searchParams } = new URL(req.url);
    const bucketId = searchParams.get('bucketId');

    if (!bucketId) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'bucketId is required' },
        { status: 400 }
      );
    }

    await requireBucketAccess(bucketId, userId);

    const obligations = await prisma.obligation.findMany({
      where: { bucketId },
      include: {
        receipts: {
          select: { id: true, status: true, fileUrl: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ ok: true, obligations });
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

/**
 * POST /api/obligations - Create a new obligation
 * Authorization: Coordinator (PAYER/SECONDARY_PAYER) or INDIVIDUAL bucket owner only
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const body = await req.json();

    if (!body.bucketId || !body.amountCents) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'bucketId and amountCents are required' },
        { status: 400 }
      );
    }

    if (!(await canManageBucket(userId, body.bucketId))) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Only coordinators or bucket owners can create obligations' },
        { status: 403 }
      );
    }

    const obligation = await prisma.obligation.create({
      data: {
        bucketId: body.bucketId,
        amountCents: body.amountCents,
        periodStart: body.periodStart ? new Date(body.periodStart) : null,
        periodEnd: body.periodEnd ? new Date(body.periodEnd) : null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        status: 'OPEN',
      },
    });

    return NextResponse.json({ ok: true, obligation }, { status: 201 });
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
