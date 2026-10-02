import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderConfig } from "../lib/providers/types";
import { createTimeSample, fetchTimeSample, type ClockSource } from "../lib/sync/sampling";

const provider: ProviderConfig = {
  id: "interpark",
  name: "Interpark",
  targetUrl: "https://ticket.interpark.com/",
  enabled: true,
};

test("sampling creates a valid sample from a Date header", async () => {
  const clock = sequenceClock([1000, 1080], [10, 90]);
  const attempt = await fetchTimeSample(provider, {
    clock,
    fetcher: async () => responseWithDate("Fri, 02 Oct 2026 11:00:00 GMT"),
  });

  assert.equal(attempt.status, "success");
  assert.equal(attempt.sample?.rttMs, 80);
  assert.equal(attempt.sample?.midpointMs, 1040);
  assert.equal(attempt.sample?.serverDateMs, Date.parse("Fri, 02 Oct 2026 11:00:00 GMT"));
});

test("sampling marks missing Date as invalid for sync", async () => {
  const attempt = await fetchTimeSample(provider, {
    fetcher: async () => new Response(null, { status: 200 }),
  });

  assert.equal(attempt.status, "missing_date");
  assert.equal(attempt.sample, null);
});

test("sampling marks invalid Date as invalid for sync", async () => {
  const attempt = await fetchTimeSample(provider, {
    fetcher: async () => responseWithDate("not-a-date"),
  });

  assert.equal(attempt.status, "invalid_date");
  assert.equal(attempt.sample, null);
});

test("sampling reports timeout errors", async () => {
  const attempt = await fetchTimeSample(provider, {
    fetcher: async () => {
      throw new Error("AbortError");
    },
  });

  assert.equal(attempt.status, "timeout");
});

test("sampling records high RTT without discarding it", () => {
  const sample = createTimeSample({
    serverDateMs: 10_000,
    requestStartedAtMs: 1_000,
    responseReceivedAtMs: 2_000,
    rttMs: 1_000,
  });

  assert.equal(sample.rttMs, 1_000);
  assert.equal(sample.midpointMs, 1_500);
  assert.equal(sample.offsetMs, 8_500);
});

function responseWithDate(date: string): Response {
  return new Response(null, {
    status: 200,
    headers: {
      date,
    },
  });
}

function sequenceClock(wall: number[], monotonic: number[]): ClockSource {
  let wallIndex = 0;
  let monotonicIndex = 0;
  return {
    nowMs: () => wall[wallIndex++] ?? wall.at(-1) ?? 0,
    monotonicMs: () => monotonic[monotonicIndex++] ?? monotonic.at(-1) ?? 0,
  };
}
