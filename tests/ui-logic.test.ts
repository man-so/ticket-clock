import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveTimeMode,
  formatCountdown,
  formatOpeningTime,
  mapSyncQualityToUiStatus,
  parseOpeningTimeInput,
  shouldAutoResync,
  shouldResyncOnForeground,
} from "../components/ticket-clock/ui-logic";

test("UI starts in initial syncing state before a clock reference exists", () => {
  assert.equal(
    deriveTimeMode({
      hasReference: false,
      syncStatus: "syncing",
      remainingMs: null,
    }),
    "loading",
  );
  assert.deepEqual(formatCountdown(null), { main: "--:--", milliseconds: ".---" });
});

test("UI maps sync success and sync failure states", () => {
  assert.equal(mapSyncQualityToUiStatus("good"), "synced");
  assert.equal(mapSyncQualityToUiStatus("unstable"), "unstable");
  assert.equal(mapSyncQualityToUiStatus("failed"), "failed");
});

test("provider change policy allows immediate sync attempt when no previous attempt exists", () => {
  assert.equal(
    shouldAutoResync({
      nowMs: 1_000,
      lastSyncAttemptAtMs: null,
      remainingMs: 60_000,
      isSyncing: false,
    }),
    true,
  );
});

test("manual re-sync keeps normal countdown display semantics", () => {
  assert.equal(
    deriveTimeMode({
      hasReference: true,
      syncStatus: "syncing",
      remainingMs: 20_000,
    }),
    "normal",
  );
});

test("countdown normal state formats minutes and milliseconds", () => {
  assert.deepEqual(formatCountdown(207_428), {
    main: "03:27",
    milliseconds: ".428",
  });
});

test("countdown enters final 10 seconds", () => {
  assert.equal(
    deriveTimeMode({
      hasReference: true,
      syncStatus: "synced",
      remainingMs: 9_999,
    }),
    "final",
  );
});

test("countdown enters GO state at zero or below", () => {
  assert.equal(
    deriveTimeMode({
      hasReference: true,
      syncStatus: "synced",
      remainingMs: 0,
    }),
    "go",
  );
  assert.equal(
    deriveTimeMode({
      hasReference: true,
      syncStatus: "synced",
      remainingMs: -1,
    }),
    "go",
  );
});

test("target time update parses and formats HH:mm:ss", () => {
  const parsed = parseOpeningTimeInput({
    hour: "09",
    minute: "05",
    second: "07",
  });
  assert.deepEqual(parsed, { hour: 9, minute: 5, second: 7 });
  assert.equal(formatOpeningTime(parsed), "09:05:07");
});

test("auto resync waits 60 seconds and pauses during final countdown", () => {
  assert.equal(
    shouldAutoResync({
      nowMs: 59_999,
      lastSyncAttemptAtMs: 0,
      remainingMs: 20_000,
      isSyncing: false,
    }),
    false,
  );
  assert.equal(
    shouldAutoResync({
      nowMs: 60_000,
      lastSyncAttemptAtMs: 0,
      remainingMs: 20_000,
      isSyncing: false,
    }),
    true,
  );
  assert.equal(
    shouldAutoResync({
      nowMs: 120_000,
      lastSyncAttemptAtMs: 0,
      remainingMs: 10_000,
      isSyncing: false,
    }),
    false,
  );
});

test("foreground resync follows stale sync policy", () => {
  assert.equal(
    shouldResyncOnForeground({
      nowMs: 60_000,
      lastSyncAttemptAtMs: 0,
      remainingMs: 30_000,
      isSyncing: false,
    }),
    true,
  );
});
