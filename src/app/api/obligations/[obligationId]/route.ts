import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { canViewObligation } from '@/lib/permissions';
import { ERROR_CODES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * GET /api/obligations/[obligationId] - Get obligation details
 * Authorization: Any household member can view
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ obligationId: string }> }
) {
  try {
    const { obligationId } = await params;
    const { userId } = await requireAuth();

    if (!(await canViewObligation(userId, obligationId))) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Access denied' },
        { status: 403 }
      );
    }

    const obligation = await prisma.obligation.findUnique({
      where: { id: obligationId },
      include: {
        receipts: {
          orderBy: { createdAt: 'desc' },
        },
        bucket: true,
      },
    });

    if (!obligation) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.NOT_FOUND, message: 'Obligation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, obligation });
  } catch (error) {
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
