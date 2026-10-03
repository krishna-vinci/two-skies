import { expect, test } from 'vitest'
import { sunAltitude, sunProgress, moonPhase } from '../src/lib/astro'

test('sun high at local noon in Kothagudem (early Oct)', () => {
  expect(sunAltitude(new Date('2026-10-03T06:30:00Z'), 17.55, 80.62)).toBeGreaterThan(60)
})
test('sun far below horizon at local midnight', () => {
  expect(sunAltitude(new Date('2026-10-02T18:30:00Z'), 17.55, 80.62)).toBeLessThan(-40)
})
test('sunProgress clamps and interpolates', () => {
  expect(sunProgress(new Date(50), 100, 200)).toBe(0)
  expect(sunProgress(new Date(150), 100, 200)).toBe(0.5)
  expect(sunProgress(new Date(999), 100, 200)).toBe(1)
})
test('moonPhase known new moon and half cycle later', () => {
  const nm = new Date('2000-01-06T18:14:00Z')
  expect(moonPhase(nm)).toBeCloseTo(0, 1)
  const full = new Date(nm.getTime() + 14.765 * 86400000)
  expect(moonPhase(full)).toBeCloseTo(0.5, 1)
})
