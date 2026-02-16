import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { ERROR_CODES } from '@/lib/constants';
import type { IdentityStatus, VerificationMethod } from '@prisma/client';

export const dynamic = 'force-dynamic';

type IdentityPayload = {
  legalFullName?: unknown;
  dob?: unknown; // ISO string or timestamp
  phoneE164?: unknown;
  ssnLast4?: unknown;

  addressLine1?: unknown;
  addressLine2?: unknown;
  city?: unknown;
  state?: unknown;
  postalCode?: unknown;
  country?: unknown;

  // DEV ONLY: allow test verification in non-production
  forceVerify?: unknown;
  method?: unknown;
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

function asDate(v: unknown): Date | undefined {
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return undefined;
}

function sanitizeLast4(v: unknown): string | undefined {
  const s = asTrimmedString(v);
  if (!s) return undefined;
  const digits = s.replace(/\D/g, '');
  if (digits.length !== 4) return undefined;
  return digits;
}

/**
 * GET /api/identity
 * Returns the current user's identity record (if any).
 */
export async function GET() {
  try {
    const { userId } = await requireAuth();

    const identity = await prisma.userIdentity.findUnique({
      where: { userId },
    });

    return NextResponse.json({ ok: true, identity });
  } catch (error) {
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
 * POST /api/identity
 * Upserts identity fields.
 *
 * Model 2 rule:
 * - User can submit identity info (status becomes PENDING unless already VERIFIED).
 * - In non-production, `forceVerify: true` can mark VERIFIED to unblock local testing.
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

    const p = body as IdentityPayload;

    const legalFullName = asTrimmedString(p.legalFullName);
    const dob = asDate(p.dob);
    const phoneE164 = asTrimmedString(p.phoneE164);
    const ssnLast4 = sanitizeLast4(p.ssnLast4);

    const addressLine1 = asTrimmedString(p.addressLine1);
    const addressLine2 = asTrimmedString(p.addressLine2);
    const city = asTrimmedString(p.city);
    const state = asTrimmedString(p.state);
    const postalCode = asTrimmedString(p.postalCode);
    const country = asTrimmedString(p.country) ?? 'US';

    const existing = await prisma.userIdentity.findUnique({
      where: { userId },
    });

    // Default: if not verified yet, submission moves to PENDING
    let nextStatus: IdentityStatus = existing?.status ?? 'UNVERIFIED';
    if (nextStatus !== 'VERIFIED') nextStatus = 'PENDING';

    // DEV escape hatch for local testing
    const forceVerify = p.forceVerify === true;
    let verifiedAt: Date | null | undefined = undefined;
    let rejectedAt: Date | null | undefined = undefined;
    let rejectedReason: string | null | undefined = undefined;

    let method: VerificationMethod | null | undefined = undefined;
    const maybeMethod = asString(p.method);
    if (maybeMethod && ['MANUAL', 'SELFIE_ID', 'KBA', 'OTHER'].includes(maybeMethod)) {
      method = maybeMethod as VerificationMethod;
    }

    if (forceVerify) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { ok: false, error: ERROR_CODES.FORBIDDEN, message: 'forceVerify is not allowed in production' },
          { status: 403 }
        );
      }
      nextStatus = 'VERIFIED';
      verifiedAt = new Date();
      rejectedAt = null;
      rejectedReason = null;
    }

    const identity = await prisma.userIdentity.upsert({
      where: { userId },
      create: {
        userId,
        status: nextStatus,
        method: method ?? null,
        legalFullName: legalFullName ?? null,
        dob: dob ?? null,
        phoneE164: phoneE164 ?? null,
        ssnLast4: ssnLast4 ?? null,
        addressLine1: addressLine1 ?? null,
        addressLine2: addressLine2 ?? null,
        city: city ?? null,
        state: state ?? null,
        postalCode: postalCode ?? null,
        country,
        verifiedAt: verifiedAt ?? null,
        rejectedAt: rejectedAt ?? null,
        rejectedReason: rejectedReason ?? null,
      },
      update: {
        status: nextStatus,
        method: method ?? existing?.method ?? null,
        legalFullName: legalFullName ?? existing?.legalFullName ?? null,
        dob: dob ?? existing?.dob ?? null,
        phoneE164: phoneE164 ?? existing?.phoneE164 ?? null,
        ssnLast4: ssnLast4 ?? existing?.ssnLast4 ?? null,
        addressLine1: addressLine1 ?? existing?.addressLine1 ?? null,
        addressLine2: addressLine2 ?? existing?.addressLine2 ?? null,
        city: city ?? existing?.city ?? null,
        state: state ?? existing?.state ?? null,
        postalCode: postalCode ?? existing?.postalCode ?? null,
        country: country ?? existing?.country ?? 'US',
        verifiedAt: verifiedAt ?? existing?.verifiedAt ?? null,
        rejectedAt: rejectedAt ?? existing?.rejectedAt ?? null,
        rejectedReason: rejectedReason ?? existing?.rejectedReason ?? null,
      },
    });

    // Log
    await prisma.actionLog.create({
      data: {
        householdId: 'SYSTEM',
        actorUserId: userId,
        action: 'IDENTITY_UPSERT',
        entityType: 'USER_IDENTITY',
        entityId: identity.id,
        metadataJson: JSON.stringify({ status: identity.status, method: identity.method }),
      },
    });

    return NextResponse.json({ ok: true, identity });
  } catch (error) {
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