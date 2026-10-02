import { isFinalTenSeconds } from "../../lib/clock/countdown";
import type { OpeningTime, TimeMode, UiSyncStatus } from "./types";

export const AUTO_RESYNC_INTERVAL_MS = 60_000;
export const STALE_FOREGROUND_RESYNC_MS = 60_000;
export const DEFAULT_OPENING_TIME: OpeningTime = {
  hour: 20,
  minute: 0,
  second: 0,
};

export function formatOpeningTime(time: OpeningTime): string {
  return `${pad2(time.hour)}:${pad2(time.minute)}:${pad2(time.second)}`;
}

export function formatCountdown(remainingMs: number | null): {
  main: string;
  milliseconds: string;
} {
  if (remainingMs === null) return { main: "--:--", milliseconds: ".---" };
  const clamped = Math.max(0, Math.floor(remainingMs));
  const totalSeconds = Math.floor(clamped / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = clamped % 1000;
  const main =
    hours > 0
      ? `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
      : `${pad2(minutes)}:${pad2(seconds)}`;
  return {
    main,
    milliseconds: `.${String(milliseconds).padStart(3, "0")}`,
  };
}

export function formatFinalCountdown(remainingMs: number): string {
  const clamped = Math.max(0, Math.floor(remainingMs));
  const seconds = Math.floor(clamped / 1000);
  const milliseconds = clamped % 1000;
  return `${seconds}.${String(milliseconds).padStart(3, "0")}`;
}

export function formatClockTime(timestampMs: number | null): string {
  if (timestampMs === null) return "--:--:--.---";
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${formatter.format(new Date(timestampMs))}.${String(
    Math.floor(timestampMs % 1000),
  ).padStart(3, "0")}`;
}

export function deriveTimeMode(params: {
  hasReference: boolean;
  syncStatus: UiSyncStatus;
  remainingMs: number | null;
}): TimeMode {
  if (!params.hasReference && params.syncStatus !== "failed") return "loading";
  if (params.remainingMs === null) return "loading";
  if (params.remainingMs <= 0) return "go";
  if (isFinalTenSeconds(params.remainingMs)) return "final";
  return "normal";
}

export function mapSyncQualityToUiStatus(
  quality: "good" | "unstable" | "failed",
): UiSyncStatus {
  if (quality === "good") return "synced";
  if (quality === "unstable") return "unstable";
  return "failed";
}

export function shouldAutoResync(params: {
  nowMs: number;
  lastSyncAttemptAtMs: number | null;
  remainingMs: number | null;
  isSyncing: boolean;
}): boolean {
  if (params.isSyncing) return false;
  if (params.remainingMs !== null && params.remainingMs <= 10_000) return false;
  if (params.lastSyncAttemptAtMs === null) return true;
  return params.nowMs - params.lastSyncAttemptAtMs >= AUTO_RESYNC_INTERVAL_MS;
}

export function shouldResyncOnForeground(params: {
  nowMs: number;
  lastSyncAttemptAtMs: number | null;
  remainingMs: number | null;
  isSyncing: boolean;
}): boolean {
  if (params.isSyncing) return false;
  if (params.remainingMs !== null && params.remainingMs <= 10_000) return false;
  if (params.lastSyncAttemptAtMs === null) return true;
  return params.nowMs - params.lastSyncAttemptAtMs >= STALE_FOREGROUND_RESYNC_MS;
}

export function parseOpeningTimeInput(params: {
  hour: string;
  minute: string;
  second: string;
}): OpeningTime {
  const hour = Number(params.hour);
  const minute = Number(params.minute);
  const second = Number(params.second);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    !Number.isInteger(second) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    throw new Error("Opening time must be a valid HH:mm:ss value.");
  }
  return { hour, minute, second };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}
