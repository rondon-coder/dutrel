import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { canManageBucket, requireBucketAccess } from '@/lib/permissions';
import { ERROR_CODES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

type CreateBody = {
  kind: 'FILE' | 'LINK' | 'NOTE';
  type?: 'LEASE' | 'HOA' | 'VENDOR' | 'INVOICE' | 'RECEIPT' | 'OTHER';
  title: string;
  pinnedToHousehold?: boolean;

  // FILE
  // Preferred (durable storage)
  storageProvider?: 'R2' | 'S3';
  objectKey?: string;
  originalName?: string;
  sha256Hex?: string;

  // Legacy / interim (keep for dev)
  fileUrl?: string;
  mimeType?: string;
  sizeBytes?: number;

  // LINK
  url?: string;

  // NOTE
  noteText?: string;

  metadataJson?: string | null;
};

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
      orderBy: { createdAt: 'desc' },
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bucketId: string }> }
) {
  try {
    const { bucketId } = await params;
    const { userId } = await requireAuth();
    const body = (await req.json()) as CreateBody;

    if (!(await canManageBucket(userId, bucketId))) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.FORBIDDEN, message: 'Not authorized to manage this bucket' },
        { status: 403 }
      );
    }

    await requireBucketAccess(bucketId, userId);

    if (!body.kind || (body.kind !== 'FILE' && body.kind !== 'LINK' && body.kind !== 'NOTE')) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid kind' },
        { status: 400 }
      );
    }

    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'title is required' },
        { status: 400 }
      );
    }

    if (body.kind === 'FILE') {
      const hasDurable = typeof body.objectKey === 'string' && body.objectKey.trim().length > 0;
      const hasLegacyUrl = typeof body.fileUrl === 'string' && body.fileUrl.trim().length > 0;

      if (!hasDurable && !hasLegacyUrl) {
        return NextResponse.json(
          {
            ok: false,
            error: ERROR_CODES.VALIDATION_ERROR,
            message: 'objectKey or fileUrl is required for FILE attachments',
          },
          { status: 400 }
        );
      }
    }

    if (body.kind === 'LINK') {
      if (!body.url || typeof body.url !== 'string') {
        return NextResponse.json(
          { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'url is required for LINK attachments' },
          { status: 400 }
        );
      }
    }

    if (body.kind === 'NOTE') {
      if (!body.noteText || typeof body.noteText !== 'string') {
        return NextResponse.json(
          { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'noteText is required for NOTE attachments' },
          { status: 400 }
        );
      }
    }

    const attachment = await prisma.bucketAttachment.create({
      data: {
        bucketId,
        createdByUserId: userId,
        kind: body.kind,
        type: body.type ?? 'OTHER',
        title: body.title.trim(),
        pinnedToHousehold: body.pinnedToHousehold ?? false,

        storageProvider: body.kind === 'FILE' ? (body.storageProvider ?? null) : null,
        objectKey: body.kind === 'FILE' ? (body.objectKey ?? null) : null,
        originalName: body.kind === 'FILE' ? (body.originalName ?? null) : null,
        sha256Hex: body.kind === 'FILE' ? (body.sha256Hex ?? null) : null,

        fileUrl: body.kind === 'FILE' ? body.fileUrl ?? null : null,
        mimeType: body.kind === 'FILE' ? body.mimeType ?? null : null,
        sizeBytes: body.kind === 'FILE' ? body.sizeBytes ?? null : null,

        url: body.kind === 'LINK' ? body.url ?? null : null,
        noteText: body.kind === 'NOTE' ? body.noteText ?? null : null,
        metadataJson: body.metadataJson ?? null,
      },
    });

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
            attachmentId: attachment.id,
            kind: attachment.kind,
            type: attachment.type,
            pinnedToHousehold: attachment.pinnedToHousehold,
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