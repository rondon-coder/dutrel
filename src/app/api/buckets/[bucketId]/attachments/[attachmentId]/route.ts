import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { canManageBucket, requireBucketAccess } from '@/lib/permissions';
import { ERROR_CODES } from '@/lib/constants';
import { AttachmentType, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

type PatchBody = {
  title?: string;
  type?: AttachmentType;
  pinnedToHousehold?: boolean;
  metadataJson?: string | null;
};

/**
 * PATCH /api/buckets/[bucketId]/attachments/[attachmentId]
 * Authorization: Coordinator or INDIVIDUAL bucket owner only
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bucketId: string; attachmentId: string }> }
) {
  try {
    const { bucketId, attachmentId } = await params;
    const { userId } = await requireAuth();
    const body = (await req.json()) as PatchBody;

    if (!(await canManageBucket(userId, bucketId))) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Not authorized to manage this bucket' },
        { status: 403 }
      );
    }

    const existing = await prisma.bucketAttachment.findFirst({
      where: { id: attachmentId, bucketId },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.NOT_FOUND, message: 'Attachment not found' },
        { status: 404 }
      );
    }

    const data: Prisma.BucketAttachmentUpdateInput = {};

    if (typeof body.title === 'string') {
      const t = body.title.trim();
      if (!t) {
        return NextResponse.json(
          { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'title cannot be empty' },
          { status: 400 }
        );
      }
      data.title = t;
    }

    if (typeof body.pinnedToHousehold === 'boolean') {
      data.pinnedToHousehold = body.pinnedToHousehold;
    }

    if (body.type) {
      data.type = body.type;
    }

    if (body.metadataJson !== undefined) {
      data.metadataJson = body.metadataJson;
    }

    const attachment = await prisma.bucketAttachment.update({
      where: { id: attachmentId },
      data,
    });

    const bucket = await prisma.bucket.findUnique({ where: { id: bucketId } });
    if (bucket) {
      await prisma.actionLog.create({
        data: {
          householdId: bucket.householdId,
          actorUserId: userId,
          action: 'BUCKET_ATTACHMENT_UPDATE',
          entityType: 'BUCKET_ATTACHMENT',
          entityId: attachmentId,
          metadataJson: JSON.stringify({
            bucketId,
            attachmentId,
            changes: body,
          }),
        },
      });
    }

    return NextResponse.json({ ok: true, attachment });
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
 * DELETE /api/buckets/[bucketId]/attachments/[attachmentId]
 * Authorization: Coordinator or INDIVIDUAL bucket owner only
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ bucketId: string; attachmentId: string }> }
) {
  try {
    const { bucketId, attachmentId } = await params;
    const { userId } = await requireAuth();

    if (!(await canManageBucket(userId, bucketId))) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Not authorized to manage this bucket' },
        { status: 403 }
      );
    }

    // Ensure bucket exists + user is household member
    await requireBucketAccess(bucketId, userId);

    const existing = await prisma.bucketAttachment.findFirst({
      where: { id: attachmentId, bucketId },
      include: { bucket: true },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.NOT_FOUND, message: 'Attachment not found' },
        { status: 404 }
      );
    }

    await prisma.bucketAttachment.delete({ where: { id: attachmentId } });

    await prisma.actionLog.create({
      data: {
        householdId: existing.bucket.householdId,
        actorUserId: userId,
        action: 'BUCKET_ATTACHMENT_DELETE',
        entityType: 'BUCKET_ATTACHMENT',
        entityId: attachmentId,
        metadataJson: JSON.stringify({
          bucketId,
          attachmentId,
          title: existing.title,
        }),
      },
    });

    return NextResponse.json({ ok: true });
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
