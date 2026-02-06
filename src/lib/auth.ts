import { headers } from 'next/headers';
import { ERROR_CODES } from '@/lib/constants';

/**
 * Phase 1 dev-only auth: reads X-User-Id header.
 * Production auth will replace this in Phase 2+.
 */
export async function requireAuth(): Promise<{ userId: string }> {
  const headersList = await headers();
  const userId = headersList.get('x-user-id');

  if (!userId) {
    throw new Error(ERROR_CODES.UNAUTHORIZED);
  }

  return { userId };
}
