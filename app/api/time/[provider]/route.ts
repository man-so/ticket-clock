import { NextResponse } from "next/server";
import { getProvider, ProviderError } from "../../../../lib/providers/registry";
import { SAMPLING_POLICY } from "../../../../lib/sync/policy";
import { syncProviderTime } from "../../../../lib/sync/sync-provider";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    provider: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { provider: providerId } = await context.params;

  try {
    const provider = getProvider(providerId);
    const result = await syncProviderTime(provider, {
      sampleCount: SAMPLING_POLICY.defaultSampleCount,
      timeoutMs: SAMPLING_POLICY.requestTimeoutMs,
      gapBetweenSamplesMs: SAMPLING_POLICY.gapBetweenSamplesMs,
    });

    return NextResponse.json(result, {
      headers: {
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
        },
        { status: error.code === "disabled_provider" ? 403 : 404 },
      );
    }

    return NextResponse.json(
      {
        error: "sync_failed",
        message: error instanceof Error ? error.message : "Unknown sync error",
      },
      { status: 502 },
    );
  }
}
