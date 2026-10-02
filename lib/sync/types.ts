import type { ProviderId } from "../providers/types";

export type SyncQuality = "good" | "unstable" | "failed";

export type TimeSample = {
  serverDateMs: number;
  requestStartedAtMs: number;
  responseReceivedAtMs: number;
  rttMs: number;
  midpointMs: number;
  offsetMs: number;
};

export type SampleAttempt = {
  sample: TimeSample | null;
  status: "success" | "missing_date" | "invalid_date" | "timeout" | "fetch_error";
  httpStatus?: number;
  error?: string;
  dateHeader?: string | null;
  targetUrl: string;
};

export type SyncResult = {
  provider: ProviderId;
  providerName: string;
  status: SyncQuality;
  estimatedServerTimeMs: number | null;
  offsetMs: number | null;
  medianRttMs: number | null;
  sampleCount: number;
  successfulSamples: number;
  failedSamples: number;
  lastSyncAtMs: number;
  targetUrl: string;
  confidence: {
    offsetSpreadMs: number | null;
    filteredSampleCount: number;
    failureRate: number;
    outlierCount: number;
    notes: string[];
  };
};
