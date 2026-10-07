import { sunAltitude } from './astro'
import type { Place, Weather } from './types'
import { skyState } from '../sky/skyState'

const HOUR = 3_600_000
const DAY = 24 * HOUR

/** Default waking hours, local time (configurable in Settings). */
export const AWAKE = { from: 7, to: 23 }
export type Awake = { from: number; to: number }

export interface Win {
  start: number
  end: number
}

const localMidnight = (t: number, offMin: number) => {
  const off = offMin * 60_000
  return Math.floor((t + off) / DAY) * DAY - off
}

/** Awake windows (absolute ms) for the days around `now`. */
export function awakeWindows(place: Place, now: number, awake: Awake = AWAKE): Win[] {
  const today = localMidnight(now, place.utcOffsetMin)
  return [-1, 0, 1, 2].map((d) => ({
    start: today + d * DAY + awake.from * HOUR,
    end: today + d * DAY + awake.to * HOUR,
  }))
}

export function overlap(a: Win[], b: Win[]): Win[] {
  const out: Win[] = []
  for (const x of a)
    for (const y of b) {
      const start = Math.max(x.start, y.start)
      const end = Math.min(x.end, y.end)
      if (end > start) out.push({ start, end })
    }
  return out.sort((p, q) => p.start - q.start)
}

export type TogetherState =
  | { kind: 'both'; minutes: number }
  | { kind: 'a-asleep' | 'b-asleep' | 'both-asleep'; minutes: number }

export function togetherState(now: number, a: Place, b: Place, awake: Awake = AWAKE): TogetherState {
  const hw = awakeWindows(a, now, awake)
  const rw = awakeWindows(b, now, awake)
  const inWin = (ws: Win[]) => ws.some((w) => w.start <= now && now < w.end)
  const both = overlap(hw, rw)
  const cur = both.find((w) => w.start <= now && now < w.end)
  if (cur) return { kind: 'both', minutes: Math.round((cur.end - now) / 60_000) }
  const next = both.find((w) => w.start > now)
  const minutes = next ? Math.round((next.start - now) / 60_000) : 0
  const hAwake = inWin(hw)
  const rAwake = inWin(rw)
  if (hAwake && !rAwake) return { kind: 'b-asleep', minutes }
  if (rAwake && !hAwake) return { kind: 'a-asleep', minutes }
  return { kind: 'both-asleep', minutes }
}

export interface SunEvent {
  place: Place
  type: 'sunrise' | 'sunset'
  time: number
}

/** The next sunrise/sunset for each place, soonest first. */
export function nextSunEvents(items: { place: Place; weather?: Weather }[], now: number): SunEvent[] {
  const out: SunEvent[] = []
  for (const { place, weather } of items) {
    if (!weather) continue
    const evs: SunEvent[] = []
    for (const d of weather.daily.slice(0, 3)) {
      evs.push({ place, type: 'sunrise', time: d.sunrise }, { place, type: 'sunset', time: d.sunset })
    }
    const next = evs.filter((e) => e.time > now).sort((a, b) => a.time - b.time)[0]
    if (next) out.push(next)
  }
  return out.sort((a, b) => a.time - b.time)
}

/** CSS linear-gradient showing the sky colour at `place` across [start, end]. */
export function dayBarGradient(place: Place, start: number, end: number, steps = 48): string {
  const stops: string[] = []
  for (let i = 0; i <= steps; i++) {
    const f = i / steps
    const t = start + (end - start) * f
    const alt = sunAltitude(new Date(t), place.lat, place.lon)
    const s = skyState({ code: 0, isDay: alt > 0, sunAltitude: alt, cloudCover: 0, windSpeed: 0, moonPhase: 0, sunProgress: 0.5 })
    const c = s.mid.map(Math.round)
    stops.push(`rgb(${c[0]},${c[1]},${c[2]}) ${(f * 100).toFixed(1)}%`)
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`
}
