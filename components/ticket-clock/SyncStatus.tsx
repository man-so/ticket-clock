"use client";

import { useEffect, useState } from "react";
import type { UiSyncStatus } from "./types";
import styles from "./TicketClock.module.css";

export function SyncStatus({
  status,
  lastSyncAtMs,
  isSyncing,
  errorMessage,
  onResync,
}: {
  status: UiSyncStatus;
  lastSyncAtMs: number | null;
  isSyncing: boolean;
  errorMessage: string | null;
  onResync: () => void;
}) {
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);
  const statusText = getStatusText(status);

  useEffect(() => {
    if (lastSyncAtMs === null) {
      setSecondsAgo(null);
      return;
    }

    const update = () =>
      setSecondsAgo(Math.max(0, Math.floor((Date.now() - lastSyncAtMs) / 1000)));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [lastSyncAtMs]);

  return (
    <footer className={styles.footer}>
      <div className={styles.statusLine} role="status" aria-live="polite">
        <span
          className={`${styles.dot} ${
            status === "syncing"
              ? styles.dotSyncing
              : status === "unstable"
                ? styles.dotUnstable
                : status === "failed"
                  ? styles.dotFailed
                  : ""
          }`}
          aria-hidden="true"
        />
        <span className={styles.statusText}>
          <span className={styles.statusTitle}>{statusText}</span>
          {status === "synced" && secondsAgo !== null ? (
            <span aria-hidden="true"> · {secondsAgo}s ago</span>
          ) : null}
          {status === "unstable" ? (
            <> · 예상 서버 시간 안정성이 낮습니다</>
          ) : null}
          {status === "failed" ? <> · 예상 서버 시간을 가져오지 못했습니다</> : null}
        </span>
      </div>

      <button
        className={styles.refreshButton}
        type="button"
        onClick={onResync}
        disabled={isSyncing}
        aria-label="Re-sync server time"
      >
        ↻ {isSyncing ? "Syncing" : "Re-sync"}
      </button>

      {status === "failed" && errorMessage ? (
        <div className={styles.errorPanel} role="alert">
          <span>{errorMessage}</span>
          <button className={styles.retryButton} type="button" onClick={onResync}>
            Retry
          </button>
        </div>
      ) : null}
    </footer>
  );
}

function getStatusText(status: UiSyncStatus): string {
  if (status === "syncing") return "SYNCING...";
  if (status === "synced") return "SYNCED";
  if (status === "unstable") return "UNSTABLE";
  return "SYNC FAILED";
}
