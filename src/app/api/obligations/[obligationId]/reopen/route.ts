import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { canManageObligation, getObligation } from '@/lib/permissions';
import { ERROR_CODES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * POST /api/obligations/[obligationId]/reopen - Reopen a CLOSED obligation
 * Authorization: Coordinator (PAYER/SECONDARY_PAYER) or INDIVIDUAL bucket owner only
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ obligationId: string }> }
) {
  try {
    const { obligationId } = await params;
    const { userId } = await requireAuth();
    const body = await req.json();

    if (!body.reason || typeof body.reason !== 'string') {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'reason is required' },
        { status: 400 }
      );
    }

    const obligation = await getObligation(obligationId);
    if (!obligation) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.NOT_FOUND, message: 'Obligation not found' },
        { status: 404 }
      );
    }

    if (!(await canManageObligation(userId, obligationId))) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Not authorized to reopen this obligation' },
        { status: 403 }
      );
    }

    if (obligation.status !== 'CLOSED') {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'Only CLOSED obligations can be reopened' },
        { status: 400 }
      );
    }

    const updated = await prisma.obligation.update({
      where: { id: obligationId },
      data: {
        status: 'OPEN',
        reopenedAt: new Date(),
        reopenedByUserId: userId,
        reopenReason: body.reason,
      },
    });

    await prisma.actionLog.create({
      data: {
        householdId: obligation.bucket.householdId,
        actorUserId: userId,
        action: 'OBLIGATION_REOPEN',
        entityType: 'OBLIGATION',
        entityId: obligationId,
        metadataJson: JSON.stringify({ reason: body.reason }),
      },
    });

    return NextResponse.json({ ok: true, obligation: updated });
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
