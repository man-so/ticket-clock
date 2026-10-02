export function getRemainingMs(params: {
  estimatedServerNowMs: number;
  targetTimestampMs: number;
}): number {
  return params.targetTimestampMs - params.estimatedServerNowMs;
}

export function isFinalTenSeconds(remainingMs: number): boolean {
  return remainingMs > 0 && remainingMs <= 10_000;
}

export function resolveSeoulTargetTimestamp(params: {
  nowMs: number;
  timeText: string;
  ifPast?: "next-day" | "today";
}): number {
  const parsed = parseTimeText(params.timeText);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date(params.nowMs));
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const todayTargetMs = Date.UTC(
    year,
    month - 1,
    day,
    parsed.hour - 9,
    parsed.minute,
    parsed.second,
    parsed.millisecond,
  );

  if ((params.ifPast ?? "next-day") === "next-day" && todayTargetMs < params.nowMs) {
    return todayTargetMs + 24 * 60 * 60 * 1000;
  }

  return todayTargetMs;
}

function parseTimeText(timeText: string): {
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
} {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(
    timeText.trim(),
  );
  if (!match) {
    throw new Error("Time must be HH:mm or HH:mm:ss.");
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? "0");
  const millisecond = Number((match[4] ?? "0").padEnd(3, "0"));

  if (hour > 23 || minute > 59 || second > 59) {
    throw new Error("Time is outside the valid clock range.");
  }

  return { hour, minute, second, millisecond };
}
