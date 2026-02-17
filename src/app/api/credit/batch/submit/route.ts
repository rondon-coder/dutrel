import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { canManageBucket } from '@/lib/permissions';
import { ERROR_CODES } from '@/lib/constants';
import type { CreditReportBatchStatus, CreditReportItemStatus, ReportingState } from '@prisma/client';

export const dynamic = 'force-dynamic';

type SubmitPayload = {
  batchId?: unknown;
};

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

/**
 * POST /api/credit/batch/submit
 *
 * Model 2 (mock): advances READY -> SUBMITTED and marks items/obligations as reported.
 * No external provider calls.
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

    const batchId = asString((body as SubmitPayload).batchId);
    if (!batchId) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'batchId is required' },
        { status: 400 }
      );
    }

    const batch = await prisma.creditReportBatch.findUnique({
      where: { id: batchId },
      include: {
        bucket: true,
        items: true,
      },
    });

    if (!batch) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.NOT_FOUND, message: 'Batch not found' },
        { status: 404 }
      );
    }

    // Permission gate: must be able to manage the bucket
    if (!(await canManageBucket(userId, batch.bucketId))) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Not authorized to manage this bucket' },
        { status: 403 }
      );
    }

    if (batch.status !== 'READY') {
      return NextResponse.json(
        {
          ok: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: `Batch must be READY to submit (current: ${batch.status})`,
        },
        { status: 400 }
      );
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const updatedBatch = await tx.creditReportBatch.update({
        where: { id: batchId },
        data: {
          status: 'SUBMITTED' as CreditReportBatchStatus,
          submittedAt: now,
        },
      });

      // Mark items submitted
      const itemsUpdated = await tx.creditReportItem.updateMany({
        where: { batchId },
        data: {
          status: 'SUBMITTED' as CreditReportItemStatus,
        },
      });

      // Mark obligations reported
      const obligationIds = batch.items.map((i) => i.obligationId);

      const obligationsUpdated = await tx.obligation.updateMany({
        where: { id: { in: obligationIds } },
        data: {
          reportingState: 'REPORTED' as ReportingState,
          reportedAt: now,
          reportingError: null,
          reportingProviderRef: `mock:${batchId}`,
        },
      });

      await tx.actionLog.create({
        data: {
          householdId: batch.householdId,
          actorUserId: userId,
          action: 'CREDIT_BATCH_SUBMIT_MOCK',
          entityType: 'CREDIT_REPORT_BATCH',
          entityId: batchId,
          metadataJson: JSON.stringify({
            bucketId: batch.bucketId,
            items: itemsUpdated.count,
            obligations: obligationsUpdated.count,
          }),
        },
      });

      return {
        batch: updatedBatch,
        itemsUpdated: itemsUpdated.count,
        obligationsUpdated: obligationsUpdated.count,
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === ERROR_CODES.UNAUTHORIZED) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' },
        { status: 401 }
      );
    }
    if (error instanceof Error && error.message === ERROR_CODES.FORBIDDEN) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Access denied' },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { ok: false, error: ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' },
      { status: 500 }
    );
  }
}