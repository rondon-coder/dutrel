import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { requireHouseholdAccess } from '@/lib/permissions';
import { ERROR_CODES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

type CreateRoomBody = {
  name: string;

  // bedroom (inches) — FE will capture 10x12 and convert to inches
  lengthIn?: number | null;
  widthIn?: number | null;
  sqft?: number | null;

  hasPrivateBath?: boolean;
  bathLengthIn?: number | null;
  bathWidthIn?: number | null;
  bathSqft?: number | null;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ householdId: string }> }
) {
  try {
    const { householdId } = await params;
    const { userId } = await requireAuth();

    await requireHouseholdAccess(householdId, userId);

    const rooms = await prisma.room.findMany({
      where: { householdId },
      orderBy: { createdAt: 'asc' },
      include: {
        assignments: {
          include: {
            householdMember: {
              include: { user: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ ok: true, rooms });
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ householdId: string }> }
) {
  try {
    const { householdId } = await params;
    const { userId } = await requireAuth();

    await requireHouseholdAccess(householdId, userId);

    const body = (await req.json()) as CreateRoomBody;

    const name = (body.name ?? '').trim();
    if (!name) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'name is required' },
        { status: 400 }
      );
    }

    const room = await prisma.room.create({
      data: {
        householdId,
        name,
        lengthIn: body.lengthIn ?? null,
        widthIn: body.widthIn ?? null,
        sqft: body.sqft ?? null,
        hasPrivateBath: Boolean(body.hasPrivateBath),
        bathLengthIn: body.bathLengthIn ?? null,
        bathWidthIn: body.bathWidthIn ?? null,
        bathSqft: body.bathSqft ?? null,
      },
    });

    await prisma.actionLog.create({
      data: {
        householdId,
        actorUserId: userId,
        action: 'ROOM_CREATE',
        entityType: 'ROOM',
        entityId: room.id,
        metadataJson: JSON.stringify({
          householdId,
          roomId: room.id,
          name,
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