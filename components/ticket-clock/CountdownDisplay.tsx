"use client";

import {
  deriveTimeMode,
  formatCountdown,
  formatFinalCountdown,
} from "./ui-logic";
import type { UiSyncStatus } from "./types";
import styles from "./TicketClock.module.css";

export function CountdownDisplay({
  remainingMs,
  syncStatus,
  hasReference,
}: {
  remainingMs: number | null;
  syncStatus: UiSyncStatus;
  hasReference: boolean;
}) {
  const mode = deriveTimeMode({ remainingMs, syncStatus, hasReference });
  const countdown = formatCountdown(remainingMs);

  if (mode === "go") {
    return (
      <div className={`${styles.goText} mono`} data-testid="go-state">
        GO!
      </div>
    );
  }

  if (mode === "final" && remainingMs !== null) {
    return (
      <div
        className={`${styles.countdown} ${styles.final}`}
        data-testid="final-countdown"
      >
        <span className={`${styles.countdownMain} mono`}>
          {formatFinalCountdown(remainingMs)}
        </span>
      </div>
    );
  }

  return (
    <div className={styles.countdown} data-testid="countdown">
      <span className={`${styles.countdownMain} mono`}>{countdown.main}</span>
      <span className={`${styles.countdownMs} mono`}>{countdown.milliseconds}</span>
    </div>
  );
}
