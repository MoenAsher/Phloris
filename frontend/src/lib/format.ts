/** Format a 0.0–1.0 rate as a percentage string, e.g. 0.6 -> "60%". */
export function formatPercent(rate: number, digits = 0): string {
  return `${(rate * 100).toFixed(digits)}%`
}

/** Format a duration in seconds human-readably, or "—" when null (no data).
 *  e.g. 37.1 -> "37.1s", 95 -> "1m 35s". */
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}
