import { expect, test } from 'vitest'
import { buildSkyInput } from '../src/sky/buildSkyInput'
import { chiangmai, mumbai } from './fixtures'
import type { Weather } from '../src/lib/types'

const day = 1_759_461_000_000 // 2025-10-03T03:10Z ~ 08:40 IST
const weather: Weather = {
  fetchedAt: 0,
  utcOffsetSeconds: 19800,
  current: { time: day, temp: 30, feelsLike: 33, humidity: 60, isDay: true, precip: 0, code: 63, cloud: 80, windSpeed: 12, windDir: 90, uv: 5 },
  hourly: [],
  air: null,
  daily: [{ date: day, code: 63, tMax: 33, tMin: 24, sunrise: day - 3 * 3600_000, sunset: day + 9 * 3600_000, precipProbMax: 60, uvMax: 8 }],
}

test('builds input from weather + time', () => {
  const i = buildSkyInput(weather, mumbai, new Date(day))
  expect(i.code).toBe(63)
  expect(i.isDay).toBe(true)
  expect(i.cloudCover).toBe(80)
  expect(i.windSpeed).toBe(12)
  expect(i.sunProgress).toBeCloseTo(0.25, 2)
  expect(i.sunAltitude).toBeGreaterThan(20)
})

test('falls back to an astronomy-only clear sky without weather', () => {
  const i = buildSkyInput(undefined, chiangmai, new Date('2026-10-03T05:00:00Z'))
  expect(i.code).toBe(0)
  expect(i.cloudCover).toBe(0)
  expect(i.sunProgress).toBeGreaterThan(0.4)
  expect(i.sunProgress).toBeLessThan(0.7)
})
