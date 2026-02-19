export type StorageProvider = 'R2' | 'S3';

export type SignedUrlOp = 'GET' | 'PUT';

export interface SignedUrlResult {
  url: string;
  expiresInSeconds: number;
}

export interface PutObjectInput {
  key: string;
  contentType?: string;
  contentLength?: number;
  metadata?: Record<string, string>;
}

export interface StorageDriver {
  provider: StorageProvider;

  /**
   * Return a presigned URL for client upload (PUT) or download (GET).
   * Frontend should never persist these URLs; they expire.
   */
  presign(key: string, op: SignedUrlOp, expiresInSeconds?: number, opts?: PutObjectInput): Promise<SignedUrlResult>;

  /** Server-side delete (admin/cleanup/backfill) */
  deleteObject(key: string): Promise<void>;

  /** Exists + basic metadata (used for migration verification) */
  headObject(key: string): Promise<{ exists: boolean; contentLength?: number; contentType?: string }>;
}
