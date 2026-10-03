import { expect, test } from 'vitest'
import { PLACES, placeById, placesFor } from '../src/lib/places'
import { timeDiffMin, formatDiff, tempGap, localTime } from '../src/lib/couple'

test('thailand is 90 min ahead of kothagudem', () => {
  expect(timeDiffMin(placeById('kothagudem'), placeById('khonkaen'))).toBe(90)
})
test('formatDiff', () => {
  expect(formatDiff(90)).toBe('1h 30m')
  expect(formatDiff(60)).toBe('1h')
  expect(formatDiff(0)).toBe('0m')
})
test('tempGap wording uses rounded delta', () => {
  expect(tempGap(31.2, 34.9)).toEqual({ delta: 4, text: '4° warmer there' })
  expect(tempGap(34, 31).text).toBe('3° cooler there')
  expect(tempGap(30, 30.2).text).toBe('Same temperature')
})
test('localTime formats HH:mm in place tz', () => {
  const d = new Date('2026-10-03T06:30:00Z')
  expect(localTime(d, placeById('kothagudem'))).toBe('12:00')
  expect(localTime(d, placeById('khonkaen'))).toBe('13:30')
})
test('four places, two per owner', () => {
  expect(PLACES).toHaveLength(4)
  expect(placesFor('him').map((p) => p.id)).toEqual(['kothagudem', 'hyderabad'])
  expect(placesFor('her').map((p) => p.id)).toEqual(['khonkaen', 'bangkok'])
})
