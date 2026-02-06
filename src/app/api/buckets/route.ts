import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { requireHouseholdMember, canManageGroupBuckets } from '@/lib/permissions';
import { ERROR_CODES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * GET /api/buckets?householdId=xxx - List buckets for a household
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId');

    if (!householdId) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'householdId is required' },
        { status: 400 }
      );
    }

    await requireHouseholdMember(householdId, userId);

    const buckets = await prisma.bucket.findMany({
      where: { householdId },
      include: {
        obligations: {
          select: { id: true, status: true, amountCents: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return NextResponse.json({ ok: true, buckets });
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
 * POST /api/buckets - Create a new bucket
 * Authorization: GROUP buckets require coordinator; INDIVIDUAL buckets can be created by any member
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const body = await req.json();

    if (!body.householdId || !body.type || !body.name) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'householdId, type, and name are required' },
        { status: 400 }
      );
    }

    const member = await requireHouseholdMember(body.householdId, userId);

    if (body.type === 'GROUP' && !canManageGroupBuckets(member.role)) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Only coordinators can create group buckets' },
        { status: 403 }
      );
    }

    const bucket = await prisma.bucket.create({
      data: {
        householdId: body.householdId,
        type: body.type,
        name: body.name,
        cadence: body.cadence || 'MONTHLY',
        variability: body.variability || 'VARIABLE',
        ownerUserId: body.type === 'INDIVIDUAL' ? userId : null,
        bufferTargetCents: body.bufferTargetCents || 0,
      },
    });

    return NextResponse.json({ ok: true, bucket }, { status: 201 });
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
