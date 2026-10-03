import { expect, test } from 'vitest'
import { describeWeather } from '../src/lib/weatherCodes'

test('maps WMO codes', () => {
  expect(describeWeather(0)).toMatchObject({ kind: 'clear', label: 'Clear sky' })
  expect(describeWeather(2).kind).toBe('partly')
  expect(describeWeather(3).kind).toBe('cloudy')
  expect(describeWeather(45).kind).toBe('fog')
  expect(describeWeather(53).kind).toBe('drizzle')
  expect(describeWeather(63).kind).toBe('rain')
  expect(describeWeather(65).intensity).toBeGreaterThan(describeWeather(61).intensity)
  expect(describeWeather(73).kind).toBe('snow')
  expect(describeWeather(81).kind).toBe('rain')
  expect(describeWeather(95).kind).toBe('thunder')
  expect(describeWeather(99).kind).toBe('thunder')
  expect(describeWeather(12345).kind).toBe('cloudy')
})
