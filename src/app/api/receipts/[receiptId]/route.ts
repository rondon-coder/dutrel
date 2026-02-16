import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { canVerifyReceipt, canViewObligation } from '@/lib/permissions';
import { ERROR_CODES } from '@/lib/constants';
import type { Prisma, ReceiptStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

type PatchBody = {
  action?: unknown;
  reason?: unknown;
};

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function asTrimmedString(v: unknown): string | undefined {
  const s = asString(v);
  if (!s) return undefined;
  const t = s.trim();
  return t.length ? t : undefined;
}

/**
 * GET /api/receipts/[receiptId] - Get receipt details
 * Authorization: Any household member can view receipts
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  try {
    const { receiptId } = await params;
    const { userId } = await requireAuth();

    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
      include: {
        obligation: {
          include: {
            bucket: {
              include: { household: true },
            },
          },
        },
        uploadedBy: {
          select: { id: true, email: true },
        },
      },
    });

    if (!receipt) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.NOT_FOUND, message: 'Receipt not found' },
        { status: 404 }
      );
    }

    if (!(await canViewObligation(userId, receipt.obligationId))) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({ ok: true, receipt });
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
 * PATCH /api/receipts/[receiptId] - Verify or dispute a receipt
 * Authorization: Coordinator (PAYER/SECONDARY_PAYER) or INDIVIDUAL bucket owner only
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  try {
    const { receiptId } = await params;
    const { userId } = await requireAuth();

    const bodyRaw: unknown = await req.json();
    if (typeof bodyRaw !== 'object' || bodyRaw === null) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.BAD_REQUEST, message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const body = bodyRaw as PatchBody;

    const action = asString(body.action);
    if (action !== 'VERIFY' && action !== 'DISPUTE') {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'action must be VERIFY or DISPUTE' },
        { status: 400 }
      );
    }

    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
      include: {
        obligation: {
          include: {
            bucket: true,
          },
        },
      },
    });

    if (!receipt) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.NOT_FOUND, message: 'Receipt not found' },
        { status: 404 }
      );
    }

    if (!(await canVerifyReceipt(userId, receipt.obligationId))) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Not authorized to review this receipt' },
        { status: 403 }
      );
    }

    const isVerify = action === 'VERIFY';
    const nextStatus: ReceiptStatus = isVerify ? 'VERIFIED' : 'DISPUTED';

    const updateData: Prisma.ReceiptUpdateInput = {
      status: nextStatus,
      reviewedByUserId: userId,
      reviewedAt: new Date(),
    };

    const reason = asTrimmedString(body.reason);
    if (!isVerify && reason) {
      updateData.disputeReason = reason;
    }

    const updated = await prisma.receipt.update({
      where: { id: receiptId },
      data: updateData,
    });

    if (isVerify) {
      await prisma.obligation.update({
        where: { id: receipt.obligationId },
        data: { status: 'CLOSED', closedAt: new Date(), closedByUserId: userId },
      });
    }

    await prisma.actionLog.create({
      data: {
        householdId: receipt.obligation.bucket.householdId,
        actorUserId: userId,
        action: isVerify ? 'RECEIPT_VERIFY' : 'RECEIPT_DISPUTE',
        entityType: 'RECEIPT',
        entityId: receiptId,
        metadataJson: JSON.stringify({ reason: reason ?? null }),
      },
    });

    return NextResponse.json({ ok: true, receipt: updated });
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