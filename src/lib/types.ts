// src/lib/types.ts

/**
 * Shared types for Dutrel API
 * Phase 1 types only - no payment partner types
 */

import {
  Household,
  HouseholdMember,
  HouseholdRole,
  Bucket,
  BucketType,
  BucketCadence,
  BucketVariability,
  Obligation,
  ObligationStatus,
} from '@prisma/client';

// Household types
export type HouseholdWithMembers = Household & {
  members: HouseholdMember[];
};

export type CreateHouseholdInput = {
  name: string;
};

export type AddMemberInput = {
  userId: string;
  role?: HouseholdRole;
  successionRank?: number;
};

// Bucket types
export type BucketWithDetails = Bucket & {
  obligations: Array<{ id: string; status: string; amountCents: number }>;
};

export type CreateBucketInput = {
  householdId: string;
  type: BucketType;
  name: string;
  cadence?: BucketCadence;
  variability?: BucketVariability;
  ownerUserId?: string;
  bufferTargetCents?: number;
};

export type UpdateBucketInput = {
  name?: string;
  autopayEnabledAt?: Date | null;
};

// Obligation types
export type ObligationWithReceipts = Obligation & {
  receipts: Array<{ id: string; status: string; fileUrl: string }>;
};

export type CreateObligationInput = {
  bucketId: string;
  amountCents: number;
  periodStart?: Date;
  periodEnd?: Date;
  dueDate?: Date;
};

export type UpdateObligationInput = {
  amountCents?: number;
  status?: ObligationStatus;
};

export type ReopenObligationInput = {
  reason: string;
};
