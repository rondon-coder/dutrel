import { S3Client, DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { PutObjectInput, SignedUrlOp, SignedUrlResult, StorageDriver } from './types';
import { getR2Config } from './config';

export function createR2Driver(): StorageDriver {
  const cfg = getR2Config();

  const client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
    forcePathStyle: true, // important for many R2 setups
  });

  return {
    provider: 'R2',

    async presign(key: string, op: SignedUrlOp, expiresInSeconds = 60 * 10, opts?: PutObjectInput): Promise<SignedUrlResult> {
      if (op === 'PUT') {
        const cmd = new PutObjectCommand({
          Bucket: cfg.bucket,
          Key: key,
          ContentType: opts?.contentType,
          Metadata: opts?.metadata,
        });
        const url = await getSignedUrl(client, cmd, { expiresIn: expiresInSeconds });
        return { url, expiresInSeconds };
      }

      const cmd = new GetObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
      });
      const url = await getSignedUrl(client, cmd, { expiresIn: expiresInSeconds });
      return { url, expiresInSeconds };
    },

    async deleteObject(key: string): Promise<void> {
      await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
    },

    async headObject(key: string): Promise<{ exists: boolean; contentLength?: number; contentType?: string }> {
      try {
        const res = await client.send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: key }));
        return {
          exists: true,
          contentLength: typeof res.ContentLength === 'number' ? res.ContentLength : undefined,
          contentType: res.ContentType || undefined,
        };
      } catch {
        return { exists: false };
      }
    },
  };
}
