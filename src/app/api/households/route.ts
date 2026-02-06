// src/app/api/households/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { ERROR_CODES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * GET /api/households - List households for the authenticated user
 */
export async function GET() {
  try {
    const { userId } = await requireAuth();

    const households = await prisma.household.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
      },
    });

    return NextResponse.json({ ok: true, households });
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

/**
 * POST /api/households - Create a new household
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const body: unknown = await req.json();

    const name = (body as { name?: unknown })?.name;
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'name is required' },
        { status: 400 }
      );
    }

    const household = await prisma.household.create({
      data: {
        name,
        members: {
          create: { userId, role: 'PAYER', successionRank: 1 },
        },
      },
      include: { members: true },
    });

    return NextResponse.json({ ok: true, household }, { status: 201 });
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
