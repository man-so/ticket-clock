import type { SampleAttempt, SyncQuality, TimeSample } from "./types";
import { median, percentile, spread } from "./statistics";

export const SAMPLING_POLICY = {
  defaultSampleCount: 7,
  minSuccessfulSamples: 3,
  requestTimeoutMs: 5000,
  gapBetweenSamplesMs: 80,
} as const;

export const OUTLIER_POLICY = {
  minSamplesBeforeFiltering: 4,
  rttMedianMultiplier: 2,
  iqrMultiplier: 1.5,
} as const;

export const QUALITY_POLICY = {
  good: {
    minSuccessfulSamples: 3,
    maxFailureRate: 0.5,
    maxMedianRttMs: 250,
    maxOffsetSpreadMs: 1200,
  },
  unstable: {
    minSuccessfulSamples: 1,
  },
} as const;

export function filterRttOutliers(samples: TimeSample[]): {
  kept: TimeSample[];
  rejected: TimeSample[];
  thresholdMs: number | null;
} {
  if (samples.length < OUTLIER_POLICY.minSamplesBeforeFiltering) {
    return { kept: samples, rejected: [], thresholdMs: null };
  }

  const rtts = samples.map((sample) => sample.rttMs);
  const medianRtt = median(rtts);
  const q1 = percentile(rtts, 25);
  const q3 = percentile(rtts, 75);

  if (medianRtt === null || q1 === null || q3 === null) {
    return { kept: samples, rejected: [], thresholdMs: null };
  }

  const iqr = q3 - q1;
  const thresholdMs = Math.max(
    medianRtt,
    Math.min(
      medianRtt * OUTLIER_POLICY.rttMedianMultiplier,
      q3 + OUTLIER_POLICY.iqrMultiplier * iqr,
    ),
  );

  const kept = samples.filter((sample) => sample.rttMs <= thresholdMs);
  return {
    kept,
    rejected: samples.filter((sample) => sample.rttMs > thresholdMs),
    thresholdMs,
  };
}

export function classifySyncQuality(params: {
  attempts: SampleAttempt[];
  filteredSamples: TimeSample[];
}): { quality: SyncQuality; notes: string[] } {
  const notes: string[] = [];
  const total = params.attempts.length;
  const successful = params.attempts.filter((attempt) => attempt.sample).length;
  const failureRate = total === 0 ? 1 : (total - successful) / total;
  const medianRtt = median(params.filteredSamples.map((sample) => sample.rttMs));
  const offsetSpread = spread(params.filteredSamples.map((sample) => sample.offsetMs));

  if (successful < QUALITY_POLICY.unstable.minSuccessfulSamples) {
    notes.push("No successful samples with a valid HTTP Date header.");
    return { quality: "failed", notes };
  }

  if (successful < QUALITY_POLICY.good.minSuccessfulSamples) {
    notes.push("Insufficient successful samples for good quality.");
    return { quality: "unstable", notes };
  }

  if (failureRate > QUALITY_POLICY.good.maxFailureRate) {
    notes.push("Failure rate is above the good-quality threshold.");
    return { quality: "unstable", notes };
  }

  if (medianRtt !== null && medianRtt > QUALITY_POLICY.good.maxMedianRttMs) {
    notes.push("Median RTT is above the good-quality threshold.");
    return { quality: "unstable", notes };
  }

  if (
    offsetSpread !== null &&
    offsetSpread > QUALITY_POLICY.good.maxOffsetSpreadMs
  ) {
    notes.push(
      "Offset spread is high after filtering; HTTP Date quantization may still contribute up to about one second.",
    );
    return { quality: "unstable", notes };
  }

  notes.push(
    "HTTP Date is second-precision; milliseconds are display interpolation, not exact server milliseconds.",
  );
  return { quality: "good", notes };
}
