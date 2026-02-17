import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { requireBucketAccess, canManageBucket } from '@/lib/permissions';
import { ERROR_CODES } from '@/lib/constants';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/buckets/[bucketId] - Get bucket details
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bucketId: string }> }
) {
  try {
    const { bucketId } = await params;
    const { userId } = await requireAuth();

    await requireBucketAccess(bucketId, userId);

    const bucket = await prisma.bucket.findUnique({
      where: { id: bucketId },
      include: {
        obligations: {
          orderBy: { createdAt: 'desc' },
        },
        members: true,
      },
    });

    return NextResponse.json({ ok: true, bucket });
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

/**
 * PATCH /api/buckets/[bucketId] - Update bucket
 * Authorization: Coordinator or INDIVIDUAL bucket owner only
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bucketId: string }> }
) {
  try {
    const { bucketId } = await params;
    const { userId } = await requireAuth();

    const body: unknown = await req.json();

    if (!(await canManageBucket(userId, bucketId))) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Not authorized to manage this bucket' },
        { status: 403 }
      );
    }

    const updateData: Prisma.BucketUpdateInput = {};

    if (typeof body === 'object' && body !== null) {
      const b = body as Record<string, unknown>;

      if (typeof b.name === 'string' && b.name.trim().length > 0) {
        updateData.name = b.name.trim();
      }

      if (b.autopayEnabledAt !== undefined) {
        // allow null / empty to unset; otherwise parse as Date
        if (b.autopayEnabledAt === null || b.autopayEnabledAt === '') {
          updateData.autopayEnabledAt = null;
        } else if (typeof b.autopayEnabledAt === 'string' || typeof b.autopayEnabledAt === 'number') {
          const d = new Date(b.autopayEnabledAt);
          if (!Number.isNaN(d.getTime())) {
            updateData.autopayEnabledAt = d;
          }
        }
      }
    }

    const bucket = await prisma.bucket.update({
      where: { id: bucketId },
      data: updateData,
    });

    await prisma.actionLog.create({
      data: {
        householdId: bucket.householdId,
        actorUserId: userId,
        action: 'BUCKET_UPDATE',
        entityType: 'BUCKET',
        entityId: bucketId,
        metadataJson: JSON.stringify(body),
      },
    });

    return NextResponse.json({ ok: true, bucket });
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