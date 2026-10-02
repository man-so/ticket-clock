#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { setTimeout as sleep } from "node:timers/promises";
import os from "node:os";

const PROVIDERS = [
  {
    id: "interpark",
    name: "Interpark",
    url: "https://ticket.interpark.com/",
    officialEvidence:
      "Search result and crawled official ticket page identify ticket.interpark.com as NOL/Interpark ticket service.",
  },
  {
    id: "yes24",
    name: "YES24",
    url: "https://ticket.yes24.com/",
    officialEvidence:
      "YES24 Ticket official English and Korean pages use ticket.yes24.com and m.ticket.yes24.com.",
  },
  {
    id: "ticketlink",
    name: "Ticketlink",
    url: "https://www.ticketlink.co.kr/",
    officialEvidence:
      "Ticketlink company/help pages state the official internet domain is ticketlink.co.kr.",
  },
  {
    id: "melon",
    name: "Melon Ticket",
    url: "https://ticket.melon.com/",
    officialEvidence:
      "Melon Ticket official pages and public store links use ticket.melon.com.",
  },
  {
    id: "weverse",
    name: "Weverse",
    url: "https://ticket.weverse.io/",
    officialEvidence:
      "Weverse Ticket official page is hosted at ticket.weverse.io.",
  },
];

const DEFAULT_SAMPLES = 12;
const DEFAULT_ROUNDS = 2;
const DEFAULT_INTERVAL_MS = 5000;
const DEFAULT_TIMEOUT_MS = 8000;

const args = parseArgs(process.argv.slice(2));
const samplesPerRound = Number(args.samples ?? DEFAULT_SAMPLES);
const rounds = Number(args.rounds ?? DEFAULT_ROUNDS);
const intervalMs = Number(args.intervalMs ?? DEFAULT_INTERVAL_MS);
const timeoutMs = Number(args.timeoutMs ?? DEFAULT_TIMEOUT_MS);
const outPath = args.out ?? "data/server-time-poc-results.json";

if (!Number.isFinite(samplesPerRound) || samplesPerRound < 1) {
  throw new Error("--samples must be a positive number");
}
if (!Number.isFinite(rounds) || rounds < 1) {
  throw new Error("--rounds must be a positive number");
}

const startedAt = new Date();
const result = {
  metadata: {
    testStartedAt: startedAt.toISOString(),
    testEndedAt: null,
    samplesPerRound,
    rounds,
    intervalMs,
    timeoutMs,
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      osRelease: os.release(),
      hostname: os.hostname(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    notes: [
      "Request elapsed time uses performance.now(), a monotonic clock.",
      "Offset is estimated as HTTP Date minus midpoint of local request start/response received wall-clock times.",
      "HTTP Date has one-second wire precision, so millisecond offset values are computational artifacts, not proven millisecond accuracy.",
      "Browser direct feasibility is inferred from CORS response headers; Date is not a CORS-safelisted response header.",
    ],
  },
  providers: PROVIDERS.map((provider) => ({
    ...provider,
    samples: [],
    corsProbe: null,
    summary: null,
  })),
};

for (const provider of result.providers) {
  console.log(`\n== ${provider.name} ${provider.url}`);
  provider.corsProbe = await probeCors(provider, timeoutMs);

  for (let round = 1; round <= rounds; round += 1) {
    console.log(`  round ${round}/${rounds}`);
    for (let sampleIndex = 1; sampleIndex <= samplesPerRound; sampleIndex += 1) {
      const sample = await measure(provider, { round, sampleIndex, timeoutMs });
      provider.samples.push(sample);
      const statusText = sample.error
        ? `ERR ${sample.error}`
        : `${sample.httpStatus} ${sample.rttMs.toFixed(1)}ms date=${sample.dateHeader ?? "none"}`;
      console.log(`    ${sampleIndex}/${samplesPerRound}: ${statusText}`);
      await sleep(150);
    }

    if (round < rounds && intervalMs > 0) {
      await sleep(intervalMs);
    }
  }

  provider.summary = summarize(provider);
}

result.metadata.testEndedAt = new Date().toISOString();
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

console.log(`\nWrote ${outPath}`);

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const [key, inlineValue] = arg.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      parsed[key] = inlineValue;
    } else {
      parsed[key] = argv[i + 1];
      i += 1;
    }
  }
  return parsed;
}

function dirname(path) {
  const normalized = path.replaceAll("\\", "/");
  const idx = normalized.lastIndexOf("/");
  return idx === -1 ? "." : normalized.slice(0, idx);
}

async function measure(provider, { round, sampleIndex, timeoutMs }) {
  const base = {
    provider: provider.name,
    providerId: provider.id,
    targetUrl: provider.url,
    round,
    sampleIndex,
    requestStart: null,
    responseReceived: null,
    method: null,
    httpStatus: null,
    finalUrl: null,
    redirected: null,
    responseType: null,
    dateHeader: null,
    parsedDateMs: null,
    rttMs: null,
    estimatedOffsetMs: null,
    rawOffsetAtResponseMs: null,
    error: null,
  };

  const methods = ["HEAD", "GET"];
  let lastError = null;
  for (const method of methods) {
    const sample = { ...base, method };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const startPerf = performance.now();
    const startWall = Date.now();
    sample.requestStart = new Date(startWall).toISOString();

    try {
      const response = await fetch(provider.url, {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "user-agent": "TicketClock-ServerTimePoC/1.0",
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      const endPerf = performance.now();
      const endWall = Date.now();
      sample.responseReceived = new Date(endWall).toISOString();
      sample.httpStatus = response.status;
      sample.finalUrl = response.url;
      sample.redirected = response.redirected;
      sample.responseType = response.type;
      sample.dateHeader = response.headers.get("date");
      sample.rttMs = endPerf - startPerf;

      if (sample.dateHeader) {
        const parsedDateMs = Date.parse(sample.dateHeader);
        sample.parsedDateMs = Number.isNaN(parsedDateMs) ? null : parsedDateMs;
        if (sample.parsedDateMs !== null) {
          const midpointWallMs = startWall + (endWall - startWall) / 2;
          sample.estimatedOffsetMs = sample.parsedDateMs - midpointWallMs;
          sample.rawOffsetAtResponseMs = sample.parsedDateMs - endWall;
        }
      }

      if (response.body) {
        await response.body.cancel().catch(() => {});
      }
      clearTimeout(timeout);

      if (method === "HEAD" && (response.status === 405 || response.status === 403)) {
        lastError = `HEAD returned ${response.status}`;
        continue;
      }

      return sample;
    } catch (error) {
      clearTimeout(timeout);
      sample.responseReceived = new Date().toISOString();
      sample.rttMs = performance.now() - startPerf;
      sample.error = error instanceof Error ? error.message : String(error);
      lastError = sample.error;
      if (method === "GET") return sample;
    }
  }

  return { ...base, error: lastError ?? "request failed" };
}

async function probeCors(provider, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const origin = "https://ticket-clock.invalid";
  try {
    const response = await fetch(provider.url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        origin,
        "user-agent": "TicketClock-ServerTimePoC/1.0",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (response.body) {
      await response.body.cancel().catch(() => {});
    }
    const allowOrigin = response.headers.get("access-control-allow-origin");
    const exposeHeaders = response.headers.get("access-control-expose-headers");
    const exposesDate =
      exposeHeaders?.split(",").some((header) => header.trim().toLowerCase() === "date") ?? false;
    clearTimeout(timeout);
    return {
      probeOrigin: origin,
      httpStatus: response.status,
      finalUrl: response.url,
      redirected: response.redirected,
      accessControlAllowOrigin: allowOrigin,
      accessControlExposeHeaders: exposeHeaders,
      browserCanReadDateHeader:
        (allowOrigin === "*" || allowOrigin === origin) && exposesDate,
      note:
        "Browser JS can read Date only when CORS allows the origin and exposes the Date response header.",
    };
  } catch (error) {
    clearTimeout(timeout);
    return {
      probeOrigin: origin,
      error: error instanceof Error ? error.message : String(error),
      browserCanReadDateHeader: false,
    };
  }
}

function summarize(provider) {
  const successes = provider.samples.filter(
    (sample) => !sample.error && sample.dateHeader && sample.estimatedOffsetMs !== null,
  );
  const failures = provider.samples.filter((sample) => sample.error || !sample.dateHeader);
  const rtts = successes.map((sample) => sample.rttMs);
  const offsets = successes.map((sample) => sample.estimatedOffsetMs);
  const filtered = filterByRtt(successes);
  const filteredOffsets = filtered.map((sample) => sample.estimatedOffsetMs);
  const dateHeaders = new Set(successes.map((sample) => sample.dateHeader));
  const finalUrls = new Set(provider.samples.map((sample) => sample.finalUrl).filter(Boolean));
  const statuses = counts(provider.samples.map((sample) => sample.httpStatus ?? "ERROR"));

  return {
    sampleCount: provider.samples.length,
    successCount: successes.length,
    failureCount: failures.length,
    statuses,
    dateHeaderPresent: successes.length > 0,
    uniqueDateHeaderCount: dateHeaders.size,
    finalUrls: [...finalUrls],
    redirectObserved: provider.samples.some((sample) => sample.redirected),
    rtt: stat(rtts),
    offset: stat(offsets),
    offsetSpreadMs:
      offsets.length > 0 ? Math.max(...offsets) - Math.min(...offsets) : null,
    filtered: {
      sampleCount: filtered.length,
      rule: "Keep samples with RTT <= min(median RTT * 2, p75 RTT + 1.5 * IQR); never below median.",
      rtt: stat(filtered.map((sample) => sample.rttMs)),
      offset: stat(filteredOffsets),
      offsetSpreadMs:
        filteredOffsets.length > 0
          ? Math.max(...filteredOffsets) - Math.min(...filteredOffsets)
          : null,
    },
  };
}

function filterByRtt(samples) {
  if (samples.length < 4) return samples;
  const rtts = samples.map((sample) => sample.rttMs).sort((a, b) => a - b);
  const med = median(rtts);
  const q1 = percentile(rtts, 25);
  const q3 = percentile(rtts, 75);
  const threshold = Math.max(med, Math.min(med * 2, q3 + 1.5 * (q3 - q1)));
  return samples.filter((sample) => sample.rttMs <= threshold);
}

function counts(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function stat(values) {
  const nums = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (nums.length === 0) {
    return {
      minMs: null,
      maxMs: null,
      medianMs: null,
      meanMs: null,
      stddevMs: null,
      p75Ms: null,
    };
  }
  const mean = nums.reduce((sum, value) => sum + value, 0) / nums.length;
  const variance =
    nums.reduce((sum, value) => sum + (value - mean) ** 2, 0) / nums.length;
  return {
    minMs: nums[0],
    maxMs: nums[nums.length - 1],
    medianMs: median(nums),
    meanMs: mean,
    stddevMs: Math.sqrt(variance),
    p75Ms: percentile(nums, 75),
  };
}

function median(sortedNums) {
  if (sortedNums.length === 0) return null;
  const mid = Math.floor(sortedNums.length / 2);
  if (sortedNums.length % 2 === 1) return sortedNums[mid];
  return (sortedNums[mid - 1] + sortedNums[mid]) / 2;
}

function percentile(sortedNums, pct) {
  if (sortedNums.length === 0) return null;
  const pos = ((sortedNums.length - 1) * pct) / 100;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedNums[base + 1] === undefined) return sortedNums[base];
  return sortedNums[base] + rest * (sortedNums[base + 1] - sortedNums[base]);
}
