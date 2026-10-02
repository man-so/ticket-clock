import type { ProviderConfig } from "../providers/types";
import { SAMPLING_POLICY } from "./policy";
import type { SampleAttempt, TimeSample } from "./types";

export type ClockSource = {
  nowMs: () => number;
  monotonicMs: () => number;
};

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type SamplingOptions = {
  sampleCount?: number;
  timeoutMs?: number;
  gapBetweenSamplesMs?: number;
  fetcher?: FetchLike;
  clock?: ClockSource;
};

const defaultClock: ClockSource = {
  nowMs: () => Date.now(),
  monotonicMs: () => performance.now(),
};

export async function collectTimeSamples(
  provider: ProviderConfig,
  options: SamplingOptions = {},
): Promise<SampleAttempt[]> {
  const sampleCount = options.sampleCount ?? SAMPLING_POLICY.defaultSampleCount;
  const gapBetweenSamplesMs =
    options.gapBetweenSamplesMs ?? SAMPLING_POLICY.gapBetweenSamplesMs;
  const attempts: SampleAttempt[] = [];

  for (let index = 0; index < sampleCount; index += 1) {
    attempts.push(await fetchTimeSample(provider, options));
    if (index < sampleCount - 1 && gapBetweenSamplesMs > 0) {
      await sleep(gapBetweenSamplesMs);
    }
  }

  return attempts;
}

export async function fetchTimeSample(
  provider: ProviderConfig,
  options: SamplingOptions = {},
): Promise<SampleAttempt> {
  const fetcher = options.fetcher ?? fetch;
  const clock = options.clock ?? defaultClock;
  const timeoutMs = options.timeoutMs ?? SAMPLING_POLICY.requestTimeoutMs;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const requestStartedAtMs = clock.nowMs();
  const monotonicStartMs = clock.monotonicMs();

  try {
    const response = await fetcher(provider.targetUrl, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "TicketClock/0.2 ServerTime",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    const responseReceivedAtMs = clock.nowMs();
    const rttMs = clock.monotonicMs() - monotonicStartMs;
    const dateHeader = response.headers.get("date");

    clearTimeout(timeout);
    if (!dateHeader) {
      return {
        sample: null,
        status: "missing_date",
        httpStatus: response.status,
        dateHeader,
        targetUrl: provider.targetUrl,
      };
    }

    const serverDateMs = Date.parse(dateHeader);
    if (!Number.isFinite(serverDateMs)) {
      return {
        sample: null,
        status: "invalid_date",
        httpStatus: response.status,
        dateHeader,
        targetUrl: provider.targetUrl,
      };
    }

    return {
      sample: createTimeSample({
        serverDateMs,
        requestStartedAtMs,
        responseReceivedAtMs,
        rttMs,
      }),
      status: "success",
      httpStatus: response.status,
      dateHeader,
      targetUrl: provider.targetUrl,
    };
  } catch (error) {
    clearTimeout(timeout);
    const message = error instanceof Error ? error.message : String(error);
    return {
      sample: null,
      status: message.toLowerCase().includes("abort") ? "timeout" : "fetch_error",
      error: message,
      targetUrl: provider.targetUrl,
    };
  }
}

export function createTimeSample(params: {
  serverDateMs: number;
  requestStartedAtMs: number;
  responseReceivedAtMs: number;
  rttMs: number;
}): TimeSample {
  const midpointMs =
    params.requestStartedAtMs +
    (params.responseReceivedAtMs - params.requestStartedAtMs) / 2;

  return {
    serverDateMs: params.serverDateMs,
    requestStartedAtMs: params.requestStartedAtMs,
    responseReceivedAtMs: params.responseReceivedAtMs,
    rttMs: params.rttMs,
    midpointMs,
    offsetMs: params.serverDateMs - midpointMs,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
