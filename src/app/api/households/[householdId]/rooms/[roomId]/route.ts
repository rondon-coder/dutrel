import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { requireHouseholdAccess } from '@/lib/permissions';
import { ERROR_CODES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

type PatchRoomBody = {
  name?: string;

  lengthIn?: number | null;
  widthIn?: number | null;
  sqft?: number | null;

  hasPrivateBath?: boolean;
  bathLengthIn?: number | null;
  bathWidthIn?: number | null;
  bathSqft?: number | null;
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ householdId: string; roomId: string }> }
) {
  try {
    const { householdId, roomId } = await params;
    const { userId } = await requireAuth();
    await requireHouseholdAccess(householdId, userId);

    const existing = await prisma.room.findFirst({
      where: { id: roomId, householdId },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.NOT_FOUND, message: 'Room not found' },
        { status: 404 }
      );
    }

    const body = (await req.json()) as PatchRoomBody;

    const data: Record<string, unknown> = {};

    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json(
          { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'name cannot be empty' },
          { status: 400 }
        );
      }
      data.name = name;
    }

    if (body.lengthIn !== undefined) data.lengthIn = body.lengthIn;
    if (body.widthIn !== undefined) data.widthIn = body.widthIn;
    if (body.sqft !== undefined) data.sqft = body.sqft;

    if (body.hasPrivateBath !== undefined) data.hasPrivateBath = Boolean(body.hasPrivateBath);
    if (body.bathLengthIn !== undefined) data.bathLengthIn = body.bathLengthIn;
    if (body.bathWidthIn !== undefined) data.bathWidthIn = body.bathWidthIn;
    if (body.bathSqft !== undefined) data.bathSqft = body.bathSqft;

    const room = await prisma.room.update({
      where: { id: roomId },
      data,
    });

    await prisma.actionLog.create({
      data: {
        householdId,
        actorUserId: userId,
        action: 'ROOM_UPDATE',
        entityType: 'ROOM',
        entityId: roomId,
        metadataJson: JSON.stringify({
          householdId,
          roomId,
          changes: body,
        }),
      },
    });

    return NextResponse.json({ ok: true, room });
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ householdId: string; roomId: string }> }
) {
  try {
    const { householdId, roomId } = await params;
    const { userId } = await requireAuth();
    await requireHouseholdAccess(householdId, userId);

    const existing = await prisma.room.findFirst({
      where: { id: roomId, householdId },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.NOT_FOUND, message: 'Room not found' },
        { status: 404 }
      );
    }

    await prisma.roomAssignment.deleteMany({ where: { roomId } });
    await prisma.room.delete({ where: { id: roomId } });

    await prisma.actionLog.create({
      data: {
        householdId,
        actorUserId: userId,
        action: 'ROOM_DELETE',
        entityType: 'ROOM',
        entityId: roomId,
        metadataJson: JSON.stringify({
          householdId,
          roomId,
          name: existing.name,
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
    return NextResponse.json(
      { ok: false, error: ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' },
      { status: 500 }
    );
  }
}