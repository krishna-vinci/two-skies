import type { Place } from './types'

export const timeDiffMin = (a: Place, b: Place) => b.utcOffsetMin - a.utcOffsetMin

export function formatDiff(min: number): string {
  const m = Math.abs(min)
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h && r) return `${h}h ${r}m`
  if (h) return `${h}h`
  return `${r}m`
}

export function tempGap(mine: number, theirs: number) {
  const delta = Math.round(theirs - mine)
  if (delta === 0) return { delta, text: 'Same temperature' }
  return { delta, text: `${Math.abs(delta)}° ${delta > 0 ? 'warmer' : 'cooler'} there` }
}

export function localTime(now: Date, place: Place): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: place.tz,
  }).format(now)
}
