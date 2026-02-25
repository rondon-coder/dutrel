import type {
    AllocationComputeInput,
    AllocationResult,
    RoomWeightInput,
  } from './types';
  
  function clampInt(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Math.trunc(n)));
  }
  
  function sum(nums: number[]): number {
    return nums.reduce((a, b) => a + b, 0);
  }
  
  function normalizePlan(plan: AllocationComputeInput['plan']): {
    method: AllocationComputeInput['plan']['method'];
    equalShareBps: number;
    weightedShareBps: number;
    includePrivateBath: boolean;
  } {
    const method = plan.method;
  
    const equalShareBps =
      typeof plan.equalShareBps === 'number' ? plan.equalShareBps : 6000;
    const weightedShareBps =
      typeof plan.weightedShareBps === 'number' ? plan.weightedShareBps : 4000;
  
    const includePrivateBath =
      typeof plan.includePrivateBath === 'boolean' ? plan.includePrivateBath : true;
  
    if (method === 'HYBRID') {
      // hard lock: must sum to 10000
      if (equalShareBps + weightedShareBps !== 10000) {
        throw new Error('HYBRID plan must have equalShareBps + weightedShareBps = 10000');
      }
    }
  
    return {
      method,
      equalShareBps: clampInt(equalShareBps, 0, 10000),
      weightedShareBps: clampInt(weightedShareBps, 0, 10000),
      includePrivateBath,
    };
  }
  
  function buildWeightMap(
    weights: RoomWeightInput[] | undefined,
    includePrivateBath: boolean
  ): Map<string, number> {
    const map = new Map<string, number>();
    if (!weights) return map;
  
    for (const w of weights) {
      const bedroom = Number.isFinite(w.bedroomSqft) ? w.bedroomSqft : 0;
      const bath =
        includePrivateBath && Number.isFinite(w.privateBathSqft ?? 0)
          ? (w.privateBathSqft ?? 0)
          : 0;
  
      const total = Math.max(0, bedroom + bath);
      map.set(w.householdMemberId, total);
    }
    return map;
  }
  
  /**
   * Deterministic rounding:
   * - compute raw cents per member
   * - floor each
   * - distribute remaining cents by largest fractional remainder
   */
  function distributeCents(
    totalCents: number,
    rawShares: { id: string; raw: number }[]
  ): Map<string, number> {
    const floors = rawShares.map((s) => ({
      id: s.id,
      floor: Math.floor(s.raw),
      frac: s.raw - Math.floor(s.raw),
    }));
  
    const floorSum = sum(floors.map((x) => x.floor));
    let remaining = totalCents - floorSum;
  
    // sort by frac desc, stable by id
    floors.sort((a, b) => (b.frac - a.frac) || a.id.localeCompare(b.id));
  
    const out = new Map<string, number>();
    for (const f of floors) out.set(f.id, f.floor);
  
    let idx = 0;
    while (remaining > 0 && floors.length > 0) {
      const pick = floors[idx % floors.length];
      out.set(pick.id, (out.get(pick.id) ?? 0) + 1);
      remaining -= 1;
      idx += 1;
    }
  
    return out;
  }
  
  export function computeAllocation(input: AllocationComputeInput): AllocationResult {
    const amountCents = clampInt(input.amountCents, 0, Number.MAX_SAFE_INTEGER);
  
    if (!Array.isArray(input.members) || input.members.length < 2) {
      throw new Error('Allocation requires at least 2 members');
    }
  
    const { method, equalShareBps, weightedShareBps, includePrivateBath } =
      normalizePlan(input.plan);
  
    const memberIds = input.members.map((m) => m.householdMemberId);
  
    // equal-only
    if (method === 'EQUAL') {
      const raw = memberIds.map((id) => ({ id, raw: amountCents / memberIds.length }));
      const centsById = distributeCents(amountCents, raw);
  
      const percentBps = Math.floor(10000 / memberIds.length);
      return {
        amountCents,
        method,
        lines: memberIds.map((id) => ({
          householdMemberId: id,
          amountCents: centsById.get(id) ?? 0,
          percentBps,
        })),
        meta: {
          equalShareBps: 10000,
          weightedShareBps: 0,
          includePrivateBath,
        },
      };
    }
  
    // room-weighted or hybrid
    const weightMap = buildWeightMap(input.weights, includePrivateBath);
    const weights = memberIds.map((id) => weightMap.get(id) ?? 0);
    const totalWeightSqft = sum(weights);
  
    if (totalWeightSqft <= 0) {
      throw new Error('Room-weighted allocation requires room weights (bedroom sqft) for members');
    }
  
    const weightedCents =
      method === 'ROOM_WEIGHTED'
        ? amountCents
        : Math.floor((amountCents * weightedShareBps) / 10000);
  
    const equalCents =
      method === 'ROOM_WEIGHTED'
        ? 0
        : amountCents - weightedCents; // remainder goes to equal
  
    // weighted raw
    const weightedRaw = memberIds.map((id, idx) => {
      const w = weights[idx];
      const raw = (weightedCents * w) / totalWeightSqft;
      return { id, raw };
    });
  
    const weightedById = distributeCents(weightedCents, weightedRaw);
  
    // equal raw
    const equalRaw = memberIds.map((id) => ({ id, raw: equalCents / memberIds.length }));
    const equalById = distributeCents(equalCents, equalRaw);
  
    const lines = memberIds.map((id) => {
      const cents = (weightedById.get(id) ?? 0) + (equalById.get(id) ?? 0);
      const percentBps = amountCents > 0 ? Math.round((cents / amountCents) * 10000) : 0;
      return { householdMemberId: id, amountCents: cents, percentBps };
    });
  
    // fix percent rounding drift by re-normalizing percentBps sum to 10000 if amountCents > 0
    if (amountCents > 0) {
      const sumBps = sum(lines.map((l) => l.percentBps));
      const drift = 10000 - sumBps;
      if (drift !== 0 && lines.length > 0) {
        lines[0].percentBps += drift;
      }
    }
  
    return {
      amountCents,
      method,
      lines,
      meta: {
        equalShareBps: method === 'ROOM_WEIGHTED' ? 0 : equalShareBps,
        weightedShareBps: method === 'ROOM_WEIGHTED' ? 10000 : weightedShareBps,
        includePrivateBath,
        totalWeightSqft,
      },
    };
  }