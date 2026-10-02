"use client";

import { formatClockTime } from "./ui-logic";
import styles from "./TicketClock.module.css";

export function ServerTimeDisplay({ timestampMs }: { timestampMs: number | null }) {
  return (
    <div className={styles.serverTime}>
      <div className={`${styles.serverTimeValue} mono`}>
        {formatClockTime(timestampMs)}
      </div>
      <div className={styles.serverTimeLabel}>Estimated server time</div>
    </div>
  );
}
