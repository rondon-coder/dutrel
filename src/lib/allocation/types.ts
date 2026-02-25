export type AllocationMethod = 'EQUAL' | 'ROOM_WEIGHTED' | 'HYBRID';

export type AllocationMemberInput = {
  householdMemberId: string;
  displayName?: string;
};

export type RoomWeightInput = {
  householdMemberId: string;
  bedroomSqft: number; // required if weighted
  privateBathSqft?: number; // optional
};

export type AllocationPlanInput = {
  method: AllocationMethod;

  // HYBRID: basis points out of 10000
  equalShareBps?: number; // default 6000
  weightedShareBps?: number; // default 4000

  includePrivateBath?: boolean; // default true
};

export type AllocationComputeInput = {
  amountCents: number;
  members: AllocationMemberInput[];
  weights?: RoomWeightInput[];
  plan: AllocationPlanInput;
};

export type AllocationLine = {
  householdMemberId: string;
  amountCents: number;
  percentBps: number;
};

export type AllocationResult = {
  amountCents: number;
  method: AllocationMethod;
  lines: AllocationLine[];
  meta: {
    equalShareBps: number;
    weightedShareBps: number;
    includePrivateBath: boolean;
    totalWeightSqft?: number;
  };
};