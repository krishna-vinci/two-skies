import { expect, test } from 'vitest'
import { skyState, lerpState } from '../src/sky/skyState'

const base = {
  code: 0,
  isDay: true,
  sunAltitude: 60,
  cloudCover: 0,
  windSpeed: 5,
  moonPhase: 0.5,
  sunProgress: 0.5,
}

test('clear noon is bright, no stars, strong sun glow', () => {
  const s = skyState(base)
  expect(s.luminance).toBeGreaterThan(0.4)
  expect(s.stars).toBe(0)
  expect(s.sunGlow).toBeGreaterThan(0.8)
  expect(s.cloudDensity).toBe(0)
})
test('clear midnight is dark with stars and moon', () => {
  const s = skyState({ ...base, isDay: false, sunAltitude: -40 })
  expect(s.luminance).toBeLessThan(0.15)
  expect(s.stars).toBeGreaterThan(0.9)
  expect(s.moonVisible).toBeGreaterThan(0.9)
  expect(s.sunGlow).toBe(0)
})
test('thunderstorm: lightning, heavy rain, dark clouds', () => {
  const s = skyState({ ...base, code: 95, cloudCover: 100 })
  expect(s.lightning).toBe(true)
  expect(s.rain).toBeGreaterThan(0.6)
  expect(s.cloudDensity).toBe(1)
  expect(s.luminance).toBeLessThan(skyState(base).luminance)
})
test('rain and snow are exclusive; fog sets fog', () => {
  expect(skyState({ ...base, code: 73 }).rain).toBe(0)
  expect(skyState({ ...base, code: 73 }).snow).toBeGreaterThan(0)
  expect(skyState({ ...base, code: 45 }).fog).toBeGreaterThan(0.5)
})
test('golden hour is warm: red > blue at bottom', () => {
  const s = skyState({ ...base, sunAltitude: 2, sunProgress: 0.95 })
  expect(s.bottom[0]).toBeGreaterThan(s.bottom[2])
})
test('lerpState endpoints', () => {
  const a = skyState(base)
  const b = skyState({ ...base, isDay: false, sunAltitude: -40 })
  expect(lerpState(a, b, 0).luminance).toBeCloseTo(a.luminance)
  expect(lerpState(a, b, 1).luminance).toBeCloseTo(b.luminance)
  expect(lerpState(a, b, 0.5).luminance).toBeLessThan(a.luminance)
})
