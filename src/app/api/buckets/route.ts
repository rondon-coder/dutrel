import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { requireHouseholdAccess } from '@/lib/permissions';
import { ERROR_CODES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const householdId = req.nextUrl.searchParams.get('householdId');

    if (!householdId) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'householdId is required' },
        { status: 400 }
      );
    }

    const member = await requireHouseholdAccess(householdId, userId);

    const where =
      member.role === 'PAYER' || member.role === 'SECONDARY_PAYER'
        ? { householdId }
        : {
            householdId,
            OR: [
              // INDIVIDUAL bucket owner
              { type: 'INDIVIDUAL', ownerUserId: userId },
              // Explicit bucket member
              { members: { some: { householdMemberId: member.id } } },
            ],
          };

    const buckets = await prisma.bucket.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        obligations: {
          select: { id: true, status: true, amountCents: true, dueDate: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        members: { select: { householdMemberId: true } },
        responsibleMembers: { select: { householdMemberId: true, role: true } },
      },
    });

    return NextResponse.json({ ok: true, buckets });
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

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const body = (await req.json()) as {
      householdId: string;
      name: string;
      type: 'GROUP' | 'INDIVIDUAL';
      cadence?: 'MONTHLY' | 'QUARTERLY' | 'OTHER';
      variability?: 'FIXED' | 'VARIABLE';
      ownerUserId?: string; // for INDIVIDUAL buckets
      memberHouseholdMemberIds?: string[]; // subset membership for GROUP buckets
      responsibleHouseholdMemberIds?: string[]; // optional responsible subset (PRIMARY first)
      autopayEnabledAt?: string | null;
      fundingMode?: 'INTERNAL' | 'VIRTUAL_ACCOUNT';
    };

    if (!body.householdId || typeof body.householdId !== 'string') {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'householdId is required' },
        { status: 400 }
      );
    }
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'name is required' },
        { status: 400 }
      );
    }
    if (body.type !== 'GROUP' && body.type !== 'INDIVIDUAL') {
      return NextResponse.json(
        { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'type must be GROUP or INDIVIDUAL' },
        { status: 400 }
      );
    }

    // Must be a household member to create buckets
    await requireHouseholdAccess(body.householdId, userId);

    const responsibleHouseholdMemberIds = body.responsibleHouseholdMemberIds;
    let memberHouseholdMemberIds = body.memberHouseholdMemberIds;

    if (body.type === 'INDIVIDUAL') {
      if (!body.ownerUserId) body.ownerUserId = userId;
      memberHouseholdMemberIds = undefined; // INDIVIDUAL doesn't use member list
    }

    if (Array.isArray(memberHouseholdMemberIds) && memberHouseholdMemberIds.length > 0) {
      const rows = await prisma.householdMember.findMany({
        where: { householdId: body.householdId, id: { in: memberHouseholdMemberIds } },
        select: { id: true },
      });

      if (rows.length !== new Set(memberHouseholdMemberIds).size) {
        return NextResponse.json(
          { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid member ids' },
          { status: 400 }
        );
      }
    }

    // Optional: designate who is responsible for this bucket (subset of members).
    // Payer/Secondary Payer still manage everything, but responsibility gives non-payers a clear ownership surface.
    if (Array.isArray(responsibleHouseholdMemberIds) && responsibleHouseholdMemberIds.length > 0) {
      const respRows = await prisma.householdMember.findMany({
        where: { householdId: body.householdId, id: { in: responsibleHouseholdMemberIds } },
        select: { id: true },
      });

      if (respRows.length !== new Set(responsibleHouseholdMemberIds).size) {
        return NextResponse.json(
          { ok: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid responsible member ids' },
          { status: 400 }
        );
      }

      // Ensure responsible members are also bucket members (visibility + access)
      if (body.type === 'GROUP') {
        const set = new Set(memberHouseholdMemberIds ?? []);
        for (const rid of responsibleHouseholdMemberIds) set.add(rid);
        memberHouseholdMemberIds = Array.from(set);
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const bucket = await tx.bucket.create({
        data: {
          householdId: body.householdId,
          type: body.type,
          name: body.name.trim(),
          cadence: body.cadence ?? 'MONTHLY',
          variability: body.variability ?? 'VARIABLE',
          ownerUserId: body.type === 'INDIVIDUAL' ? body.ownerUserId : null,
          autopayEnabledAt: body.autopayEnabledAt ? new Date(body.autopayEnabledAt) : null,
          fundingMode: body.fundingMode ?? 'INTERNAL',
        },
      });

      if (body.type === 'GROUP' && Array.isArray(memberHouseholdMemberIds) && memberHouseholdMemberIds.length > 0) {
        await tx.bucketMember.createMany({
          data: memberHouseholdMemberIds.map((householdMemberId) => ({
            bucketId: bucket.id,
            householdMemberId,
          })),
          skipDuplicates: true,
        });
      }

      if (Array.isArray(responsibleHouseholdMemberIds) && responsibleHouseholdMemberIds.length > 0) {
        await tx.bucketResponsibility.createMany({
          data: responsibleHouseholdMemberIds.map((householdMemberId, idx) => ({
            bucketId: bucket.id,
            householdMemberId,
            role: idx === 0 ? 'PRIMARY' : 'SECONDARY',
          })),
        });
      }

      await tx.actionLog.create({
        data: {
          householdId: body.householdId,
          actorUserId: userId,
          action: 'BUCKET_CREATE',
          entityType: 'BUCKET',
          entityId: bucket.id,
          metadataJson: JSON.stringify({
            bucketId: bucket.id,
            name: bucket.name,
            type: bucket.type,
            memberHouseholdMemberIds: memberHouseholdMemberIds ?? [],
            responsibleHouseholdMemberIds: responsibleHouseholdMemberIds ?? [],
          }),
        },
      });

      return bucket;
    });

    return NextResponse.json({ ok: true, bucket: created });
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