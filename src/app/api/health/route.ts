// src/app/api/health/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startedAt = Date.now();
  let dbOk = true;
  let dbError: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    dbOk = false;
    dbError = e instanceof Error ? e.message : 'UNKNOWN_DB_ERROR';
  }

  return NextResponse.json({
    ok: true,
    service: 'dutrel',
    status: 'up',
    dbOk,
    dbError,
    ms: Date.now() - startedAt,
    time: new Date().toISOString(),
  });
}
