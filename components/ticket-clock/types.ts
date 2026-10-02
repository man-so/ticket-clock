import type { ProviderId } from "../../lib/providers/types";
import type { SyncQuality, SyncResult } from "../../lib/sync/types";

export type UiSyncStatus = "syncing" | "synced" | "unstable" | "failed";

export type PublicProvider = {
  id: ProviderId;
  name: string;
};

export type OpeningTime = {
  hour: number;
  minute: number;
  second: number;
};

export type TimeMode = "loading" | "normal" | "final" | "go";

export type SyncApiResult = SyncResult;
