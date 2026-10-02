"use client";

import { useMemo } from "react";
import { PUBLIC_PROVIDERS } from "./providers";
import { CountdownDisplay } from "./CountdownDisplay";
import { OpeningTime } from "./OpeningTime";
import { ProviderSelector } from "./ProviderSelector";
import { ServerTimeDisplay } from "./ServerTimeDisplay";
import { SyncStatus } from "./SyncStatus";
import { useTicketClock } from "./useTicketClock";
import { deriveTimeMode, formatOpeningTime } from "./ui-logic";
import styles from "./TicketClock.module.css";

export function TicketClock() {
  const clock = useTicketClock();
  const providerName = useMemo(
    () =>
      PUBLIC_PROVIDERS.find((provider) => provider.id === clock.provider)?.name ??
      clock.provider,
    [clock.provider],
  );
  const mode = deriveTimeMode({
    hasReference: clock.clockReference !== null,
    syncStatus: clock.syncStatus,
    remainingMs: clock.remainingMs,
  });
  const isFinalLike = mode === "final" || mode === "go";

  return (
    <main
      className={`${styles.shell} ${isFinalLike ? styles.finalLayout : ""}`}
      data-mode={mode}
    >
      <div className={styles.stage}>
        <header className={styles.header}>
          <h1 className={styles.brand}>Ticket Clock</h1>
          <div className={styles.summary}>
            <span>{providerName}</span>
            <span aria-hidden="true">·</span>
            <span className="mono">{formatOpeningTime(clock.openingTime)} open</span>
          </div>
        </header>

        <section className={styles.controls} aria-label="Ticket clock settings">
          <div className={styles.controlPill}>
            <ProviderSelector
              provider={clock.provider}
              onChange={clock.setProvider}
            />
            <span className={styles.divider} aria-hidden="true" />
            <OpeningTime
              value={clock.openingTime}
              onChange={clock.setOpeningTime}
            />
          </div>
        </section>

        <section className={styles.main} aria-label="Ticket countdown">
          <p className={styles.eyebrow}>
            {mode === "final"
              ? "Final Countdown"
              : mode === "go"
                ? "Ticket Open"
                : "Ticket Opens In"}
          </p>
          <CountdownDisplay
            remainingMs={clock.remainingMs}
            syncStatus={clock.syncStatus}
            hasReference={clock.clockReference !== null}
          />
          <ServerTimeDisplay timestampMs={clock.estimatedServerNowMs} />
        </section>

        <SyncStatus
          status={clock.syncStatus}
          lastSyncAtMs={clock.syncResult?.lastSyncAtMs ?? null}
          isSyncing={clock.isSyncing}
          errorMessage={clock.errorMessage}
          onResync={clock.manualResync}
        />
      </div>
    </main>
  );
}
