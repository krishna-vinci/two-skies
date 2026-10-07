import { expect, test } from 'vitest'
// @ts-expect-error plain JS module
import { cleanPlace } from '../server/places.mjs'
import { manualRecord, rankResults, resultToRecord } from '../src/lib/geocode'

test('geocoding hit -> stored place; unrelated admin/country joined, duplicates dropped', () => {
  const r = resultToRecord({ id: 1153671, name: 'Chiang Mai', latitude: 18.79, longitude: 98.98, timezone: 'Asia/Bangkok', country: 'Thailand', admin1: 'Chiang Mai' })
  expect(r).toEqual({ id: 'c:g1153671', name: 'Chiang Mai', subtitle: 'Thailand', lat: 18.79, lon: 98.98, tz: 'Asia/Bangkok' })
  const p = resultToRecord({ id: 5, name: 'Pattaya', latitude: 12.93, longitude: 100.88, timezone: 'Asia/Bangkok', country: 'Thailand', admin1: 'Chon Buri' })
  expect(p?.subtitle).toBe('Chon Buri, Thailand')
})

test('a hit without a timezone is unusable', () => {
  expect(resultToRecord({ id: 1, name: 'X', latitude: 1, longitude: 2 })).toBeNull()
})

test('manual and geocoded records both pass the server validator', () => {
  const m = manualRecord('  Old Town ', 19.0512, 72.8234, 'Asia/Kolkata')
  expect(m.name).toBe('Old Town')
  expect(cleanPlace(m)).not.toBeNull()
  expect(cleanPlace(manualRecord('West', -33.9, -118.4, 'America/Los_Angeles'))).not.toBeNull() // negative coords make a valid id
  const g = resultToRecord({ id: 9, name: 'Z', latitude: 1, longitude: 2, timezone: 'UTC' })!
  expect(cleanPlace(g)).not.toBeNull()
})

test('rankResults: prefix matches first, then population; ignores case and diacritics', () => {
  const g = (id: number, name: string, population?: number) => ({ id, name, latitude: 0, longitude: 0, timezone: 'UTC', population })
  const noisy = [g(1, 'Gujiang'), g(2, 'Jiangmen', 1_795_459), g(3, 'Chiang Rai', 78_756), g(4, 'Chiang Mai', 127_240), g(5, 'Chianga')]
  expect(rankResults('chiang', noisy).map((r) => r.name)).toEqual(['Chiang Mai', 'Chiang Rai', 'Chianga', 'Jiangmen', 'Gujiang'])
  expect(rankResults('HYDERABAD', [g(1, 'Hyderābād', 1_921_275), g(2, 'Hyderabad', 6_993_262)]).map((r) => r.id)).toEqual([2, 1])
  expect(rankResults('x', [])).toEqual([])
})

test('id prefix: c = added place, p = configured city; both accepted by the right validator', () => {
  const asConfig = resultToRecord({ id: 7, name: 'Lisbon', latitude: 38.7, longitude: -9.1, timezone: 'Europe/Lisbon' }, 'p')!
  expect(asConfig.id).toBe('p:g7')
  expect(cleanPlace(asConfig)).toBeNull() // the places store only takes c: ids
  expect(cleanPlace(asConfig, /^[\w][\w:.-]{0,39}$/)).not.toBeNull()
  expect(manualRecord('Home', 1.5, -2.25, 'UTC', 'p').id).toBe('p:m1.500_-2.250')
})
