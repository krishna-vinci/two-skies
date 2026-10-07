import { expect, test } from 'vitest'
import { awakeWindows, dayBarGradient, nextSunEvents, overlap, togetherState } from '../src/lib/together'
import { chiangmai, mumbai } from './fixtures'
import type { Weather } from '../src/lib/types'

const him = mumbai
const her = chiangmai
const at = (iso: string) => Date.parse(iso)

test('awake windows are 07:00-23:00 local', () => {
  const ws = awakeWindows(him, at('2026-10-03T03:30:00Z'))
  const today = ws.find((w) => w.start <= at('2026-10-03T03:30:00Z') && at('2026-10-03T03:30:00Z') < w.end)!
  expect(today.start).toBe(at('2026-10-03T01:30:00Z')) // 07:00 IST
  expect(today.end).toBe(at('2026-10-03T17:30:00Z')) // 23:00 IST
})

test('overlap of IST and ICT days is 01:30Z-16:00Z', () => {
  const now = at('2026-10-03T03:30:00Z')
  const o = overlap(awakeWindows(him, now), awakeWindows(her, now)).find((w) => w.start === at('2026-10-03T01:30:00Z'))!
  expect(o.end).toBe(at('2026-10-03T16:00:00Z'))
})

test('both awake: minutes left in the shared window', () => {
  expect(togetherState(at('2026-10-03T03:30:00Z'), him, her)).toEqual({ kind: 'both', minutes: 750 })
})
test('side B is asleep while side A is up; next overlap in 9h', () => {
  expect(togetherState(at('2026-10-03T16:30:00Z'), him, her)).toEqual({ kind: 'b-asleep', minutes: 540 })
})
test('both asleep', () => {
  expect(togetherState(at('2026-10-03T20:00:00Z'), him, her)).toEqual({ kind: 'both-asleep', minutes: 330 })
})
test('side A is asleep before the morning while side B is up', () => {
  // 00:30Z = 06:00 IST (asleep) / 07:30 ICT (awake)
  expect(togetherState(at('2026-10-03T00:30:00Z'), him, her).kind).toBe('a-asleep')
})

const wx = (sunrise: number, sunset: number): Weather => ({
  fetchedAt: 0, utcOffsetSeconds: 0,
  current: { time: 0, temp: 0, feelsLike: 0, humidity: 0, isDay: true, precip: 0, code: 0, cloud: 0, windSpeed: 0, windDir: 0, uv: 0 },
  hourly: [], air: null,
  daily: [0, 1, 2].map((i) => ({ date: 0, code: 0, tMax: 0, tMin: 0, sunrise: sunrise + i * 86400000, sunset: sunset + i * 86400000, precipProbMax: 0, uvMax: 0 })),
})
test('next sun events: one per place, soonest first', () => {
  const now = at('2026-10-03T09:00:00Z')
  const a = wx(at('2026-10-03T00:30:00Z'), at('2026-10-03T12:30:00Z')) // him: next = sunset 12:30Z
  const b = wx(at('2026-10-03T23:00:00Z') - 86400000, at('2026-10-03T11:00:00Z')) // her: next = sunset 11:00Z
  const ev = nextSunEvents([{ place: him, weather: a }, { place: her, weather: b }], now)
  expect(ev.map((e) => [e.place.id, e.type])).toEqual([['chiangmai', 'sunset'], ['mumbai', 'sunset']])
  expect(nextSunEvents([{ place: him }], now)).toEqual([])
})

test('day bar gradient has steps+1 stops and darker night than noon', () => {
  const g = dayBarGradient(him, at('2026-10-03T00:00:00Z'), at('2026-10-04T00:00:00Z'), 24)
  expect(g.match(/rgb\(/g)).toHaveLength(25)
  const rgbs = [...g.matchAll(/rgb\((\d+),(\d+),(\d+)\)/g)].map((m) => +m[1] + +m[2] + +m[3])
  expect(rgbs[12]).toBeGreaterThan(rgbs[0]) // 12:00Z ~ 17:30 IST vs 05:30 IST dawn... brighter than midnight-ish start
})

test('custom waking hours move the shared window', () => {
  const awake = { from: 9, to: 21 } // 09:00-21:00 local
  const now = at('2026-10-03T03:30:00Z') // 09:00 IST, 10:30 ICT
  // A wakes at 09:00 IST = 03:30Z, B at 09:00 ICT = 02:00Z, so the overlap starts at 03:30Z
  const o = overlap(awakeWindows(him, now, awake), awakeWindows(her, now, awake)).find((w) => w.start === at('2026-10-03T03:30:00Z'))!
  expect(o.end).toBe(at('2026-10-03T14:00:00Z')) // B sleeps at 21:00 ICT = 14:00Z (A's 21:00 IST = 15:30Z)
  expect(togetherState(now, him, her, awake)).toEqual({ kind: 'both', minutes: 630 })
})
