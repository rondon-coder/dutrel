import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { canManageBucket } from '@/lib/permissions';
import { ERROR_CODES } from '@/lib/constants';
import { AllocationMethod } from '@prisma/client';

export const dynamic = 'force-dynamic';

type UpsertPlanBody = {
  method: AllocationMethod;
  equalShareBps?: number;
  weightedShareBps?: number;
  includePrivateBath?: boolean;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bucketId: string }> }
) {
  try {
    const { bucketId } = await params;
    const { userId } = await requireAuth();

    if (!(await canManageBucket(userId, bucketId))) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Not authorized' },
        { status: 403 }
      );
    }

    const plan = await prisma.allocationPlan.findUnique({ where: { bucketId } });
    return NextResponse.json({ ok: true, plan });
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bucketId: string }> }
) {
  try {
    const { bucketId } = await params;
    const { userId } = await requireAuth();

    if (!(await canManageBucket(userId, bucketId))) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Not authorized' },
        { status: 403 }
      );
    }

    const body = (await req.json()) as UpsertPlanBody;

    if (!body.method) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'method is required' },
        { status: 400 }
      );
    }

    const equalShareBps = typeof body.equalShareBps === 'number' ? body.equalShareBps : 6000;
    const weightedShareBps = typeof body.weightedShareBps === 'number' ? body.weightedShareBps : 4000;

    if (body.method === 'HYBRID' && equalShareBps + weightedShareBps !== 10000) {
      return NextResponse.json(
        {
          ok: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'HYBRID requires equalShareBps + weightedShareBps = 10000',
        },
        { status: 400 }
      );
    }

    const plan = await prisma.allocationPlan.upsert({
      where: { bucketId },
      update: {
        method: body.method,
        equalShareBps,
        weightedShareBps,
        includePrivateBath: typeof body.includePrivateBath === 'boolean' ? body.includePrivateBath : true,
      },
      create: {
        bucketId,
        method: body.method,
        equalShareBps,
        weightedShareBps,
        includePrivateBath: typeof body.includePrivateBath === 'boolean' ? body.includePrivateBath : true,
      },
    });

    const bucket = await prisma.bucket.findUnique({ where: { id: bucketId } });
    if (bucket) {
      await prisma.actionLog.create({
        data: {
          householdId: bucket.householdId,
          actorUserId: userId,
          action: 'ALLOCATION_PLAN_UPSERT',
          entityType: 'ALLOCATION_PLAN',
          entityId: plan.id,
          metadataJson: JSON.stringify({ bucketId, plan }),
        },
      });
    }

    return NextResponse.json({ ok: true, plan });
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