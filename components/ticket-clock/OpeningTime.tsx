"use client";

import { memo, useEffect, useState } from "react";
import { formatOpeningTime, parseOpeningTimeInput } from "./ui-logic";
import type { OpeningTime as OpeningTimeValue } from "./types";
import styles from "./TicketClock.module.css";

function OpeningTimeComponent({
  value,
  onChange,
}: {
  value: OpeningTimeValue;
  onChange: (value: OpeningTimeValue) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    hour: String(value.hour).padStart(2, "0"),
    minute: String(value.minute).padStart(2, "0"),
    second: String(value.second).padStart(2, "0"),
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) {
      setDraft({
        hour: String(value.hour).padStart(2, "0"),
        minute: String(value.minute).padStart(2, "0"),
        second: String(value.second).padStart(2, "0"),
      });
    }
  }, [editing, value]);

  const apply = () => {
    try {
      const parsed = parseOpeningTimeInput(draft);
      onChange(parsed);
      setError(null);
      setEditing(false);
    } catch (applyError) {
      setError(
        applyError instanceof Error
          ? applyError.message
          : "Opening time is invalid.",
      );
    }
  };

  return (
    <>
      <button
        className={`${styles.timeButton} mono`}
        type="button"
        onClick={() => setEditing(true)}
        aria-haspopup="dialog"
      >
        <span>OPEN</span>
        {formatOpeningTime(value)}
      </button>

      {editing ? (
        <div
          className={styles.sheetBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="opening-time-title"
        >
          <div className={styles.sheet}>
            <div className={styles.sheetHeader}>
              <h2 className={styles.sheetTitle} id="opening-time-title">
                Ticket opens at
              </h2>
              <button
                className={styles.closeButton}
                type="button"
                onClick={() => setEditing(false)}
                aria-label="Close opening time editor"
              >
                ×
              </button>
            </div>

            <div className={styles.timeGrid}>
              <label className={styles.field}>
                HH
                <input
                  className="mono"
                  inputMode="numeric"
                  maxLength={2}
                  value={draft.hour}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      hour: digits(event.target.value, 2),
                    }))
                  }
                />
              </label>
              <label className={styles.field}>
                MM
                <input
                  className="mono"
                  inputMode="numeric"
                  maxLength={2}
                  value={draft.minute}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      minute: digits(event.target.value, 2),
                    }))
                  }
                />
              </label>
              <label className={styles.field}>
                SS
                <input
                  className="mono"
                  inputMode="numeric"
                  maxLength={2}
                  value={draft.second}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      second: digits(event.target.value, 2),
                    }))
                  }
                />
              </label>
            </div>

            {error ? <p role="alert">{error}</p> : null}

            <button className={styles.applyButton} type="button" onClick={apply}>
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function digits(value: string, max: number): string {
  return value.replace(/\D/g, "").slice(0, max);
}

export const OpeningTime = memo(OpeningTimeComponent);
