import assert from "node:assert/strict";
import test from "node:test";
import {
  compareOffset,
  createClockReference,
  getEstimatedServerNowMs,
} from "../lib/clock/clock-engine";

test("clock engine creates a reference from sync time", () => {
  const reference = createClockReference(
    {
      estimatedServerTimeMs: 10_000,
      offsetMs: 500,
      lastSyncAtMs: 9_500,
    },
    100,
  );

  assert.equal(reference.estimatedServerTimeMs, 10_000);
  assert.equal(reference.capturedAtMonotonicMs, 100);
});

test("clock engine advances by monotonic elapsed time", () => {
  const reference = {
    estimatedServerTimeMs: 10_000,
    capturedAtMonotonicMs: 100,
    offsetMs: 500,
    lastSyncAtMs: 9_500,
  };

  assert.equal(getEstimatedServerNowMs(reference, 250), 10_150);
});

test("clock engine keeps offset metadata and compares resync offsets", () => {
  const comparison = compareOffset({ offsetMs: 500 }, { offsetMs: 620 });
  assert.equal(comparison.deltaMs, 120);
  assert.equal(comparison.absDeltaMs, 120);
});

test("clock engine does not accumulate tick drift", () => {
  const reference = {
    estimatedServerTimeMs: 10_000,
    capturedAtMonotonicMs: 1_000,
    offsetMs: 0,
    lastSyncAtMs: 10_000,
  };

  const first = getEstimatedServerNowMs(reference, 1_016);
  const later = getEstimatedServerNowMs(reference, 2_000);
  assert.equal(first, 10_016);
  assert.equal(later, 11_000);
});
