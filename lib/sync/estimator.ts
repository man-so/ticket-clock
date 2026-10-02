import type { ProviderConfig } from "../providers/types";
import { classifySyncQuality, filterRttOutliers } from "./policy";
import { median, spread } from "./statistics";
import type { SampleAttempt, SyncResult, TimeSample } from "./types";

export function estimateOffset(
  provider: ProviderConfig,
  attempts: SampleAttempt[],
  nowMs = Date.now(),
): SyncResult {
  const validSamples = attempts
    .map((attempt) => attempt.sample)
    .filter((sample): sample is TimeSample => sample !== null);
  const filtered = filterRttOutliers(validSamples);
  const offsets = filtered.kept.map((sample) => sample.offsetMs);
  const rtts = filtered.kept.map((sample) => sample.rttMs);
  const offsetMs = median(offsets);
  const medianRttMs = median(rtts);
  const quality = classifySyncQuality({
    attempts,
    filteredSamples: filtered.kept,
  });
  const successfulSamples = validSamples.length;
  const failedSamples = attempts.length - successfulSamples;

  return {
    provider: provider.id,
    providerName: provider.name,
    status: offsetMs === null ? "failed" : quality.quality,
    estimatedServerTimeMs: offsetMs === null ? null : nowMs + offsetMs,
    offsetMs,
    medianRttMs,
    sampleCount: attempts.length,
    successfulSamples,
    failedSamples,
    lastSyncAtMs: nowMs,
    targetUrl: provider.targetUrl,
    confidence: {
      offsetSpreadMs: spread(offsets),
      filteredSampleCount: filtered.kept.length,
      failureRate: attempts.length === 0 ? 1 : failedSamples / attempts.length,
      outlierCount: filtered.rejected.length,
      notes: quality.notes,
    },
  };
}
