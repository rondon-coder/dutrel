import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { canManageBucket, requireBucketAccess } from '@/lib/permissions';
import { ERROR_CODES } from '@/lib/constants';
import type {
  CreditReportBatchStatus,
  CreditReportItemStatus,
  ReportingState,
} from '@prisma/client';

export const dynamic = 'force-dynamic';

type PreparePayload = {
  bucketId?: unknown;
  periodStart?: unknown; // ISO string or timestamp
  periodEnd?: unknown;   // ISO string or timestamp
};

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function asDate(v: unknown): Date | undefined {
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return undefined;
}

function isOnTimeClosed(dueDate: Date | null, closedAt: Date | null): boolean {
  if (!dueDate || !closedAt) return false;
  return closedAt.getTime() <= dueDate.getTime();
}

/**
 * POST /api/credit/batch/prepare
 *
 * Creates a DRAFT batch and queues eligible obligations (positive-only).
 * Eligibility (Model 2):
 * - Bucket is INDIVIDUAL
 * - Bucket creditReportingStatus == ACTIVE
 * - Obligation.status == CLOSED
 * - dueDate exists AND closedAt exists AND closedAt <= dueDate (on-time)
 * - reportingState not already REPORTED
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

    const bucketId = asString((body as PreparePayload).bucketId);
    if (!bucketId) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'bucketId is required' },
        { status: 400 }
      );
    }

    const periodStart = asDate((body as PreparePayload).periodStart);
    const periodEnd = asDate((body as PreparePayload).periodEnd);

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
          message: 'Credit reporting batches can only be prepared for INDIVIDUAL buckets',
        },
        { status: 400 }
      );
    }

    if (bucket.creditReportingStatus !== 'ACTIVE' || !bucket.creditReportingEnabled) {
      return NextResponse.json(
        {
          ok: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'Credit reporting must be ACTIVE before preparing batches',
        },
        { status: 400 }
      );
    }

    // We report on the owner user for INDIVIDUAL buckets.
    const ownerUserId = bucket.ownerUserId;
    if (!ownerUserId) {
      return NextResponse.json(
        {
          ok: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'INDIVIDUAL bucket must have ownerUserId to prepare credit reporting batch',
        },
        { status: 400 }
      );
    }

    const identity = await prisma.userIdentity.findUnique({ where: { userId: ownerUserId } });
    if (!identity || identity.status !== 'VERIFIED') {
      return NextResponse.json(
        {
          ok: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'Owner identity must be VERIFIED before preparing credit reporting batches',
        },
        { status: 400 }
      );
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // Pull candidate obligations
      const obligations = await tx.obligation.findMany({
        where: {
          bucketId,
          status: 'CLOSED',
          // optional period filter
          ...(periodStart || periodEnd
            ? {
                AND: [
                  periodStart ? { closedAt: { gte: periodStart } } : {},
                  periodEnd ? { closedAt: { lte: periodEnd } } : {},
                ],
              }
            : {}),
        },
        orderBy: { closedAt: 'asc' },
      });

      // Determine eligibility
      const eligible = obligations.filter((o) => {
        if (o.reportingState === 'REPORTED') return false;
        if (!isOnTimeClosed(o.dueDate, o.closedAt)) return false;
        return true;
      });

      // Create batch even if empty (audit trail), but mark READY only if it has items
      const batch = await tx.creditReportBatch.create({
        data: {
          bucketId,
          householdId: bucket.householdId,
          provider: bucket.creditReportingProvider,
          status: 'DRAFT' as CreditReportBatchStatus,
          periodStart: periodStart ?? null,
          periodEnd: periodEnd ?? null,
          createdByUserId: userId,
          metadataJson: JSON.stringify({
            selection: 'positive-only',
            onTimeRule: 'closedAt <= dueDate',
            countCandidates: obligations.length,
            countEligible: eligible.length,
          }),
        },
      });

      const createdItems: string[] = [];

      for (const o of eligible) {
        // Create item (unique on [batchId, obligationId])
        const item = await tx.creditReportItem.create({
          data: {
            batchId: batch.id,
            obligationId: o.id,
            userId: ownerUserId,
            status: 'QUEUED' as CreditReportItemStatus,
            amountCents: o.amountCents,
            dueDate: o.dueDate ?? null,
            paidAt: o.closedAt ?? null,
          },
        });

        createdItems.push(item.id);

        // Update obligation state
        await tx.obligation.update({
          where: { id: o.id },
          data: {
            reportingState: 'QUEUED' as ReportingState,
            reportingEligibleAt: o.reportingEligibleAt ?? now,
            reportingQueuedAt: now,
            reportingError: null,
          },
        });
      }

      // If we created items, mark batch READY
      const finalBatch =
        createdItems.length > 0
          ? await tx.creditReportBatch.update({
              where: { id: batch.id },
              data: { status: 'READY' as CreditReportBatchStatus },
            })
          : batch;

      await tx.actionLog.create({
        data: {
          householdId: bucket.householdId,
          actorUserId: userId,
          action: 'CREDIT_BATCH_PREPARE',
          entityType: 'CREDIT_REPORT_BATCH',
          entityId: finalBatch.id,
          metadataJson: JSON.stringify({
            bucketId,
            createdItems: createdItems.length,
            periodStart: periodStart?.toISOString() ?? null,
            periodEnd: periodEnd?.toISOString() ?? null,
          }),
        },
      });

      return { batch: finalBatch, itemsCreated: createdItems.length };
    });

    return NextResponse.json({ ok: true, ...result });
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