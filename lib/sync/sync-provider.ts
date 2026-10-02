import type { ProviderConfig } from "../providers/types";
import { collectTimeSamples, type SamplingOptions } from "./sampling";
import { estimateOffset } from "./estimator";
import type { SyncResult } from "./types";

export async function syncProviderTime(
  provider: ProviderConfig,
  options: SamplingOptions = {},
): Promise<SyncResult> {
  const attempts = await collectTimeSamples(provider, options);
  return estimateOffset(provider, attempts);
}
