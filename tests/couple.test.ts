import { expect, test } from 'vitest'
import { chiangmai, mumbai } from './fixtures'
import { timeDiffMin, formatDiff, tempGap, localTime } from '../src/lib/couple'

test('Chiang Mai (ICT) is 90 min ahead of Mumbai (IST)', () => {
  expect(timeDiffMin(mumbai, chiangmai)).toBe(90)
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
  expect(localTime(d, mumbai)).toBe('12:00')
  expect(localTime(d, chiangmai)).toBe('13:30')
})
