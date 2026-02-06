// src/app/api/households/[householdId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { requireHouseholdMember } from '@/lib/permissions';
import { ERROR_CODES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * GET /api/households/[householdId] - Get household details
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ householdId: string }> }
) {
  try {
    const { householdId } = await params;
    const { userId } = await requireAuth();

    await requireHouseholdMember(householdId, userId);

    const household = await prisma.household.findUnique({
      where: { id: householdId },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true } },
          },
          orderBy: { successionRank: 'asc' },
        },
        buckets: true,
      },
    });

    if (!household) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.NOT_FOUND, message: 'Household not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, household });
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
