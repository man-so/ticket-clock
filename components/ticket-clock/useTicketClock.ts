"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createClockReference,
  getEstimatedServerNowMs,
  type ClockReference,
} from "../../lib/clock/clock-engine";
import {
  getRemainingMs,
  resolveSeoulTargetTimestamp,
} from "../../lib/clock/countdown";
import type { ProviderId } from "../../lib/providers/types";
import type { SyncResult } from "../../lib/sync/types";
import {
  DEFAULT_OPENING_TIME,
  formatOpeningTime,
  mapSyncQualityToUiStatus,
  shouldAutoResync,
  shouldResyncOnForeground,
} from "./ui-logic";
import type { OpeningTime, UiSyncStatus } from "./types";

export type TicketClockState = {
  provider: ProviderId;
  setProvider: (provider: ProviderId) => void;
  openingTime: OpeningTime;
  setOpeningTime: (time: OpeningTime) => void;
  syncStatus: UiSyncStatus;
  syncResult: SyncResult | null;
  clockReference: ClockReference | null;
  estimatedServerNowMs: number | null;
  remainingMs: number | null;
  targetTimestampMs: number | null;
  lastSyncAttemptAtMs: number | null;
  isSyncing: boolean;
  errorMessage: string | null;
  manualResync: () => void;
};

export function useTicketClock(initialProvider: ProviderId = "interpark"): TicketClockState {
  const [provider, setProviderState] = useState<ProviderId>(initialProvider);
  const [openingTime, setOpeningTime] =
    useState<OpeningTime>(DEFAULT_OPENING_TIME);
  const [syncStatus, setSyncStatus] = useState<UiSyncStatus>("syncing");
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [clockReference, setClockReference] = useState<ClockReference | null>(
    null,
  );
  const [estimatedServerNowMs, setEstimatedServerNowMs] = useState<number | null>(
    null,
  );
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [targetTimestampMs, setTargetTimestampMs] = useState<number | null>(null);
  const [lastSyncAttemptAtMs, setLastSyncAttemptAtMs] = useState<number | null>(
    null,
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const syncRequestId = useRef(0);
  const clockReferenceRef = useRef<ClockReference | null>(null);
  const remainingMsRef = useRef<number | null>(null);
  const lastSyncAttemptRef = useRef<number | null>(null);
  const isSyncingRef = useRef(false);
  const providerRef = useRef(provider);
  const targetTimestampRef = useRef<number | null>(null);
  const openingTimeTextRef = useRef("20:00:00");

  const openingTimeText = useMemo(
    () => formatOpeningTime(openingTime),
    [openingTime],
  );

  const sync = useCallback(
    async (mode: "initial" | "manual" | "auto" | "provider-change") => {
      const requestId = syncRequestId.current + 1;
      syncRequestId.current = requestId;
      const attemptStartedAt = Date.now();
      setLastSyncAttemptAtMs(attemptStartedAt);
      lastSyncAttemptRef.current = attemptStartedAt;
      setIsSyncing(true);
      isSyncingRef.current = true;
      setErrorMessage(null);
      if (mode === "initial" || mode === "provider-change") {
        setSyncStatus("syncing");
      }

      try {
        const response = await fetch(`/api/time/${providerRef.current}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as SyncResult | { message?: string };
        if (!response.ok) {
          throw new Error("message" in payload && payload.message ? payload.message : "Sync failed");
        }

        if (requestId !== syncRequestId.current) return;
        const result = payload as SyncResult;
        setSyncResult(result);

        if (result.status === "failed" || result.estimatedServerTimeMs === null) {
          setSyncStatus("failed");
          setErrorMessage("예상 서버 시간을 가져오지 못했습니다.");
          return;
        }

        const reference = createClockReference(result, performance.now());
        clockReferenceRef.current = reference;
        setClockReference(reference);
        const nextTarget = resolveSeoulTargetTimestamp({
          nowMs: reference.estimatedServerTimeMs,
          timeText: openingTimeTextRef.current,
        });
        targetTimestampRef.current = nextTarget;
        setTargetTimestampMs(nextTarget);
        setSyncStatus(mapSyncQualityToUiStatus(result.status));
      } catch (error) {
        if (requestId !== syncRequestId.current) return;
        setSyncStatus(clockReferenceRef.current ? "unstable" : "failed");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "예상 서버 시간을 가져오지 못했습니다.",
        );
      } finally {
        if (requestId === syncRequestId.current) {
          setIsSyncing(false);
          isSyncingRef.current = false;
        }
      }
    },
    [],
  );

  const setProvider = useCallback(
    (nextProvider: ProviderId) => {
      providerRef.current = nextProvider;
      setProviderState(nextProvider);
      setSyncResult(null);
      setClockReference(null);
      clockReferenceRef.current = null;
      setEstimatedServerNowMs(null);
      setRemainingMs(null);
      remainingMsRef.current = null;
      setTargetTimestampMs(null);
      targetTimestampRef.current = null;
      setSyncStatus("syncing");
      void sync("provider-change");
    },
    [sync],
  );

  const manualResync = useCallback(() => {
    void sync("manual");
  }, [sync]);

  useEffect(() => {
    providerRef.current = provider;
  }, [provider]);

  useEffect(() => {
    openingTimeTextRef.current = openingTimeText;
  }, [openingTimeText]);

  useEffect(() => {
    void sync("initial");
  }, [sync]);

  useEffect(() => {
    let frame = 0;

    const tick = () => {
      const reference = clockReferenceRef.current;
      if (reference) {
        const serverNow = getEstimatedServerNowMs(reference, performance.now());
        let target = targetTimestampRef.current;
        if (target === null) {
          target = resolveSeoulTargetTimestamp({
            nowMs: serverNow,
            timeText: openingTimeText,
          });
          targetTimestampRef.current = target;
          setTargetTimestampMs(target);
        }
        const remaining = getRemainingMs({
          estimatedServerNowMs: serverNow,
          targetTimestampMs: target,
        });
        setEstimatedServerNowMs(serverNow);
        setRemainingMs(remaining);
        remainingMsRef.current = remaining;

        if (
          shouldAutoResync({
            nowMs: Date.now(),
            lastSyncAttemptAtMs: lastSyncAttemptRef.current,
            remainingMs: remaining,
            isSyncing: isSyncingRef.current,
          })
        ) {
          void sync("auto");
        }
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [openingTimeText, sync]);

  useEffect(() => {
    const reference = clockReferenceRef.current;
    if (!reference) {
      setTargetTimestampMs(null);
      targetTimestampRef.current = null;
      return;
    }
    const serverNow = getEstimatedServerNowMs(reference, performance.now());
    const target = resolveSeoulTargetTimestamp({
      nowMs: serverNow,
      timeText: openingTimeText,
    });
    targetTimestampRef.current = target;
    setTargetTimestampMs(target);
  }, [openingTimeText]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      const reference = clockReferenceRef.current;
      if (reference) {
        const serverNow = getEstimatedServerNowMs(reference, performance.now());
        setEstimatedServerNowMs(serverNow);
      }
      if (
        shouldResyncOnForeground({
          nowMs: Date.now(),
          lastSyncAttemptAtMs: lastSyncAttemptRef.current,
          remainingMs: remainingMsRef.current,
          isSyncing: isSyncingRef.current,
        })
      ) {
        void sync("auto");
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [sync]);

  return {
    provider,
    setProvider,
    openingTime,
    setOpeningTime,
    syncStatus,
    syncResult,
    clockReference,
    estimatedServerNowMs,
    remainingMs,
    targetTimestampMs,
    lastSyncAttemptAtMs,
    isSyncing,
    errorMessage,
    manualResync,
  };
}
