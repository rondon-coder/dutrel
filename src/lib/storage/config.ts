import type { StorageProvider } from './types';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function getDefaultStorageProvider(): StorageProvider {
  const raw = (process.env.STORAGE_PROVIDER_DEFAULT || 'R2').toUpperCase();
  if (raw !== 'R2' && raw !== 'S3') return 'R2';
  return raw as StorageProvider;
}

export function getR2Config() {
  return {
    endpoint: requireEnv('R2_ENDPOINT'),
    region: process.env.R2_REGION || 'auto',
    bucket: requireEnv('R2_BUCKET'),
    accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
  };
}

export function getS3Config() {
  return {
    region: requireEnv('AWS_REGION'),
    bucket: requireEnv('S3_BUCKET'),
    accessKeyId: requireEnv('AWS_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('AWS_SECRET_ACCESS_KEY'),
  };
}
