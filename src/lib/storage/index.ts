// src/lib/storage/index.ts
import type { StorageDriver, StorageProvider } from './types';
import { getDefaultStorageProvider } from './config';
import { createR2Driver } from './r2';
import { createS3Driver } from './s3';

let cachedR2: StorageDriver | null = null;
let cachedS3: StorageDriver | null = null;

/**
 * Driver selector with in-process caching.
 * - Default provider comes from env (STORAGE_PROVIDER_DEFAULT), falling back to R2.
 */
export function getStorageDriver(provider?: StorageProvider): StorageDriver {
  const p = provider || getDefaultStorageProvider();

  if (p === 'S3') {
    if (!cachedS3) cachedS3 = createS3Driver();
    return cachedS3;
  }

  if (!cachedR2) cachedR2 = createR2Driver();
  return cachedR2;
}

/**
 * Convenience singleton: default provider driver.
 * NOTE: Will read env vars on first access (via driver creation).
 */
export const storage: StorageDriver = getStorageDriver();

/**
 * Single source-of-truth path generator
 * If we NEVER change this format, R2->S3 is trivial.
 */
export function buildAttachmentObjectKey(args: {
  householdId: string;
  bucketId: string;
  attachmentId: string;
  filename: string;
}): string {
  const safeName = args.filename.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return `households/${args.householdId}/buckets/${args.bucketId}/attachments/${args.attachmentId}/${safeName}`;
}