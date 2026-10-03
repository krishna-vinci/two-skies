import { expect, test } from 'vitest'
import { aqiCategory, uvLabel } from '../src/lib/labels'

test('aqi buckets', () => {
  expect(aqiCategory(42).label).toBe('Good')
  expect(aqiCategory(88).label).toBe('Moderate')
  expect(aqiCategory(130).label).toBe('Unhealthy for sensitive groups')
  expect(aqiCategory(180).label).toBe('Unhealthy')
  expect(aqiCategory(250).label).toBe('Very unhealthy')
  expect(aqiCategory(400).label).toBe('Hazardous')
})
test('uv labels', () => {
  expect(uvLabel(1)).toBe('Low')
  expect(uvLabel(4)).toBe('Moderate')
  expect(uvLabel(7)).toBe('High')
  expect(uvLabel(9)).toBe('Very high')
  expect(uvLabel(12)).toBe('Extreme')
})
