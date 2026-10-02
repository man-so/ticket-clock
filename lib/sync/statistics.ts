export function median(values: number[]): number | null {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

export function percentile(values: number[], pct: number): number | null {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const pos = ((sorted.length - 1) * pct) / 100;
  const base = Math.floor(pos);
  const rest = pos - base;
  const current = sorted[base];
  const next = sorted[base + 1];
  if (current === undefined) return null;
  if (next === undefined) return current;
  return current + rest * (next - current);
}

export function spread(values: number[]): number | null {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return null;
  return Math.max(...finite) - Math.min(...finite);
}
