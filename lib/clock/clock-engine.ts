import type { SyncResult } from "../sync/types";

export type ClockReference = {
  estimatedServerTimeMs: number;
  capturedAtMonotonicMs: number;
  offsetMs: number;
  lastSyncAtMs: number;
};

export function createClockReference(
  sync: Pick<SyncResult, "estimatedServerTimeMs" | "offsetMs" | "lastSyncAtMs">,
  monotonicNowMs: number,
): ClockReference {
  if (sync.estimatedServerTimeMs === null || sync.offsetMs === null) {
    throw new Error("Cannot create a clock reference from a failed sync.");
  }

  return {
    estimatedServerTimeMs: sync.estimatedServerTimeMs,
    capturedAtMonotonicMs: monotonicNowMs,
    offsetMs: sync.offsetMs,
    lastSyncAtMs: sync.lastSyncAtMs,
  };
}

export function getEstimatedServerNowMs(
  reference: ClockReference,
  monotonicNowMs: number,
): number {
  return (
    reference.estimatedServerTimeMs +
    (monotonicNowMs - reference.capturedAtMonotonicMs)
  );
}

export function compareOffset(
  current: Pick<ClockReference, "offsetMs">,
  next: Pick<ClockReference, "offsetMs">,
): { deltaMs: number; absDeltaMs: number } {
  const deltaMs = next.offsetMs - current.offsetMs;
  return { deltaMs, absDeltaMs: Math.abs(deltaMs) };
}
