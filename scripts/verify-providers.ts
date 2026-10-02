import { listProviders } from "../lib/providers/registry";
import { syncProviderTime } from "../lib/sync/sync-provider";

for (const provider of listProviders()) {
  if (!provider.enabled) continue;
  const result = await syncProviderTime(provider, {
    sampleCount: 7,
    timeoutMs: 5000,
    gapBetweenSamplesMs: 80,
  });

  console.log(
    JSON.stringify(
      {
        provider: result.provider,
        status: result.status,
        sampleCount: result.sampleCount,
        successfulSamples: result.successfulSamples,
        medianRttMs: result.medianRttMs,
        offsetMs: result.offsetMs,
        offsetSpreadMs: result.confidence.offsetSpreadMs,
        outlierCount: result.confidence.outlierCount,
      },
      null,
      2,
    ),
  );
}
