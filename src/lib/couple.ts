import { formatDuration } from '../../shared/format.js'
import type { Place } from './types'

export const timeDiffMin = (a: Place, b: Place) => b.utcOffsetMin - a.utcOffsetMin

/** 90 -> "1h 30m" in the language (via Intl). */
export const formatDiff = (min: number, lang = 'en') => formatDuration(Math.abs(min), lang, 'narrow')

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
