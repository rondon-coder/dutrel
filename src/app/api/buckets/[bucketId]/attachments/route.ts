import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { canManageBucket, requireBucketAccess } from '@/lib/permissions';
import { ERROR_CODES } from '@/lib/constants';
import { AttachmentKind, AttachmentType, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

type CreateAttachmentBody =
  | {
      kind: 'FILE';
      type?: AttachmentType;
      title: string;
      pinnedToHousehold?: boolean;
      fileUrl: string;
      mimeType?: string;
      sizeBytes?: number;
      metadataJson?: string;
    }
  | {
      kind: 'LINK';
      type?: AttachmentType;
      title: string;
      pinnedToHousehold?: boolean;
      url: string;
      metadataJson?: string;
    }
  | {
      kind: 'NOTE';
      type?: AttachmentType;
      title: string;
      pinnedToHousehold?: boolean;
      noteText: string;
      metadataJson?: string;
    };

/**
 * GET /api/buckets/[bucketId]/attachments
 * Authorization: Any household member with bucket access can view
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bucketId: string }> }
) {
  try {
    const { bucketId } = await params;
    const { userId } = await requireAuth();

    await requireBucketAccess(bucketId, userId);

    const attachments = await prisma.bucketAttachment.findMany({
      where: { bucketId },
      orderBy: [{ pinnedToHousehold: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ ok: true, attachments });
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
 * POST /api/buckets/[bucketId]/attachments
 * Authorization: Coordinator or INDIVIDUAL bucket owner only (canManageBucket)
 *
 * NOTE: This endpoint accepts pre-hosted fileUrl for FILE attachments.
 * (Same pattern as receipts. Multipart upload can be a later upgrade.)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bucketId: string }> }
) {
  try {
    const { bucketId } = await params;
    const { userId } = await requireAuth();
    const body = (await req.json()) as CreateAttachmentBody;

    if (!(await canManageBucket(userId, bucketId))) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Not authorized to manage this bucket' },
        { status: 403 }
      );
    }

    if (!body || !('kind' in body) || !('title' in body) || !body.title?.trim()) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'kind and title are required' },
        { status: 400 }
      );
    }

    const kind = body.kind as AttachmentKind;
    if (!['FILE', 'LINK', 'NOTE'].includes(kind)) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'kind must be FILE, LINK, or NOTE' },
        { status: 400 }
      );
    }

    const type: AttachmentType = (body.type ?? 'OTHER') as AttachmentType;
    const pinnedToHousehold = !!body.pinnedToHousehold;

    const baseData: Prisma.BucketAttachmentCreateInput = {
      title: body.title.trim(),
      kind,
      type,
      pinnedToHousehold,
      metadataJson: 'metadataJson' in body ? body.metadataJson ?? null : null,
      bucket: { connect: { id: bucketId } },
      createdBy: { connect: { id: userId } },
    };

    let createData: Prisma.BucketAttachmentCreateInput = baseData;

    if (kind === 'FILE') {
      if (!('fileUrl' in body) || !body.fileUrl?.trim()) {
        return NextResponse.json(
          { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'fileUrl is required for FILE' },
          { status: 400 }
        );
      }
      createData = {
        ...baseData,
        fileUrl: body.fileUrl.trim(),
        mimeType: body.mimeType?.trim() ?? null,
        sizeBytes: typeof body.sizeBytes === 'number' ? body.sizeBytes : null,
      };
    }

    if (kind === 'LINK') {
      if (!('url' in body) || !body.url?.trim()) {
        return NextResponse.json(
          { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'url is required for LINK' },
          { status: 400 }
        );
      }
      createData = { ...baseData, url: body.url.trim() };
    }

    if (kind === 'NOTE') {
      if (!('noteText' in body) || !body.noteText?.trim()) {
        return NextResponse.json(
          { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'noteText is required for NOTE' },
          { status: 400 }
        );
      }
      createData = { ...baseData, noteText: body.noteText.trim() };
    }

    const attachment = await prisma.bucketAttachment.create({
      data: createData,
    });

    // Action log (householdId derived from bucket)
    const bucket = await prisma.bucket.findUnique({ where: { id: bucketId } });
    if (bucket) {
      await prisma.actionLog.create({
        data: {
          householdId: bucket.householdId,
          actorUserId: userId,
          action: 'BUCKET_ATTACHMENT_CREATE',
          entityType: 'BUCKET_ATTACHMENT',
          entityId: attachment.id,
          metadataJson: JSON.stringify({
            bucketId,
            kind,
            type,
            pinnedToHousehold,
            title: attachment.title,
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
