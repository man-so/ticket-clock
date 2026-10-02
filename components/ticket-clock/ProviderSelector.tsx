"use client";

import { memo } from "react";
import type { ProviderId } from "../../lib/providers/types";
import { PUBLIC_PROVIDERS } from "./providers";
import styles from "./TicketClock.module.css";

function ProviderSelectorComponent({
  provider,
  onChange,
}: {
  provider: ProviderId;
  onChange: (provider: ProviderId) => void;
}) {
  return (
    <label>
      <span className="sr-only">Provider</span>
      <select
        className={styles.providerSelect}
        value={provider}
        onChange={(event) => onChange(event.target.value as ProviderId)}
        aria-label="Select ticket provider"
      >
        {PUBLIC_PROVIDERS.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export const ProviderSelector = memo(ProviderSelectorComponent);
