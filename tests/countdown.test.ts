import assert from "node:assert/strict";
import test from "node:test";
import {
  getRemainingMs,
  isFinalTenSeconds,
  resolveSeoulTargetTimestamp,
} from "../lib/clock/countdown";

test("countdown calculates normal remaining time", () => {
  assert.equal(
    getRemainingMs({ estimatedServerNowMs: kst("2026-10-02T19:50:00"), targetTimestampMs: kst("2026-10-02T20:00:00") }),
    600_000,
  );
});

test("countdown detects <= 10 seconds", () => {
  assert.equal(isFinalTenSeconds(10_000), true);
  assert.equal(isFinalTenSeconds(10_001), false);
});

test("countdown returns zero at target", () => {
  const now = kst("2026-10-02T20:00:00");
  assert.equal(getRemainingMs({ estimatedServerNowMs: now, targetTimestampMs: now }), 0);
});

test("countdown returns negative after target", () => {
  assert.equal(
    getRemainingMs({ estimatedServerNowMs: kst("2026-10-02T20:00:01"), targetTimestampMs: kst("2026-10-02T20:00:00") }),
    -1_000,
  );
});

test("Seoul target resolver handles midnight rollover", () => {
  const now = kst("2026-10-02T23:59:00");
  const target = resolveSeoulTargetTimestamp({ nowMs: now, timeText: "00:00:00" });
  assert.equal(target - now, 60_000);
});

test("Seoul target resolver uses next day when HH:mm:ss already passed", () => {
  const now = kst("2026-10-02T19:50:00");
  const target = resolveSeoulTargetTimestamp({ nowMs: now, timeText: "19:00:00" });
  assert.equal(target - now, 23 * 60 * 60 * 1000 + 10 * 60 * 1000);
});

function kst(localIso: string): number {
  return Date.parse(`${localIso}+09:00`);
}
