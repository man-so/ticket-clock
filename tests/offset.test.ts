import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderConfig } from "../lib/providers/types";
import { filterRttOutliers } from "../lib/sync/policy";
import { median } from "../lib/sync/statistics";
import { estimateOffset } from "../lib/sync/estimator";
import type { SampleAttempt, TimeSample } from "../lib/sync/types";

const provider: ProviderConfig = {
  id: "interpark",
  name: "Interpark",
  targetUrl: "https://ticket.interpark.com/",
  enabled: true,
};

test("median handles odd and even sample counts", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
});

test("RTT outlier filtering rejects high RTT samples", () => {
  const samples = [sample(10, 100), sample(11, 110), sample(12, 120), sample(500, 130)];
  const filtered = filterRttOutliers(samples);
  assert.equal(filtered.kept.length, 3);
  assert.equal(filtered.rejected.length, 1);
});

test("estimator uses median offset after filtering", () => {
  const attempts: SampleAttempt[] = [
    attempt(sample(10, 100)),
    attempt(sample(12, 120)),
    attempt(sample(11, 110)),
    attempt(sample(500, 10_000)),
  ];

  const result = estimateOffset(provider, attempts, 1_000);
  assert.equal(result.offsetMs, 110);
  assert.equal(result.status, "good");
});

test("estimator reports unstable when samples are insufficient", () => {
  const result = estimateOffset(provider, [attempt(sample(10, 100))], 1_000);
  assert.equal(result.status, "unstable");
});

test("estimator reports failed with no valid samples", () => {
  const result = estimateOffset(
    provider,
    [
      {
        sample: null,
        status: "missing_date",
        targetUrl: provider.targetUrl,
      },
    ],
    1_000,
  );
  assert.equal(result.status, "failed");
});

function sample(rttMs: number, offsetMs: number): TimeSample {
  return {
    serverDateMs: 1_000 + offsetMs,
    requestStartedAtMs: 1_000,
    responseReceivedAtMs: 1_000 + rttMs,
    rttMs,
    midpointMs: 1_000,
    offsetMs,
  };
}

function attempt(timeSample: TimeSample): SampleAttempt {
  return {
    sample: timeSample,
    status: "success",
    targetUrl: provider.targetUrl,
  };
}
