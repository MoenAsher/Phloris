/** Format a 0.0–1.0 rate as a percentage string, e.g. 0.6 -> "60%". */
export function formatPercent(rate: number, digits = 0): string {
  return `${(rate * 100).toFixed(digits)}%`
}

/** Format a duration in seconds human-readably, or "—" when null (no data).
 *  e.g. 37.1 -> "37.1s", 95 -> "1m 35s". */
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60)
    const s = Math.round(seconds % 60)
    return `${m}m ${s}s`
  }
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}h ${String(m).padStart(2, '0')}m`
  }
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  return `${d}d ${h}h`
}
