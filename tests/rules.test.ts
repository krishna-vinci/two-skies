import { expect, test } from 'vitest'
import { alertsFor, nowcast } from '../shared/rules.js'
import { alertText, morningText, nowcastText, weatherLabel } from '../shared/messages.js'

const T0 = Date.parse('2026-10-03T12:00:00Z')
const slot = (minOffset: number, precip: number) => ({ time: T0 + minOffset * 60_000, precip })

test('nowcast: dry window', () => {
  expect(nowcast([slot(0, 0), slot(15, 0.05), slot(30, 0)], T0 + 5 * 60_000).kind).toBe('dry')
})
test('nowcast: rain soon reports minutes to the first wet slot', () => {
  const nc = nowcast([slot(0, 0), slot(15, 0), slot(30, 0.6)], T0 + 5 * 60_000)
  expect(nc).toEqual({ kind: 'soon', minutes: 25 })
})
test('nowcast: raining now, ending, and continuous', () => {
  const ending = nowcast([slot(0, 1), slot(15, 0.8), slot(30, 0)], T0 + 3 * 60_000)
  expect(ending).toEqual({ kind: 'ending', minutes: 27 })
  expect(nowcast([slot(0, 1), slot(15, 1)], T0 + 3 * 60_000).kind).toBe('now')
})
test('nowcast: past slots ignored; empty -> unknown', () => {
  expect(nowcast([slot(-60, 5), slot(-45, 5)], T0).kind).toBe('unknown')
  expect(nowcast(undefined, T0).kind).toBe('unknown')
})

const base = { current: { feelsLike: 30, uv: 3, isDay: true, code: 1 }, now: T0 }
test('alerts: none on a mild day', () => {
  expect(alertsFor(base)).toEqual([])
})
test('alerts: aqi levels', () => {
  expect(alertsFor({ ...base, air: { usAqi: 120 } })[0]).toMatchObject({ id: 'aqi', level: 1 })
  expect(alertsFor({ ...base, air: { usAqi: 180 } })[0]).toMatchObject({ id: 'aqi', level: 2 })
  expect(alertsFor({ ...base, air: { usAqi: 260 } })[0]).toMatchObject({ id: 'aqi', level: 3 })
})
test('alerts: heat uses the higher of now and daily max; sorted by level', () => {
  const a = alertsFor({ ...base, daily0: { apparentMax: 42 }, air: { usAqi: 110 } })
  expect(a.map((x) => x.id)).toEqual(['heat', 'aqi'])
  expect(a[0]).toMatchObject({ level: 2, value: 42 })
})
test('alerts: uv only in daytime', () => {
  const d = { uvMax: 9 }
  expect(alertsFor({ ...base, daily0: d }).some((x) => x.id === 'uv')).toBe(true)
  expect(alertsFor({ ...base, current: { ...base.current, isDay: false }, daily0: d }).some((x) => x.id === 'uv')).toBe(false)
})
test('alerts: storm within 3h beats umbrella tip', () => {
  const hourly = [{ time: T0 + 3600_000, code: 95 }]
  const a = alertsFor({ ...base, hourly, daily0: { precipProbMax: 90 } })
  expect(a.map((x) => x.id)).toEqual(['storm'])
  expect(alertsFor({ ...base, daily0: { precipProbMax: 70 } })[0].id).toBe('umbrella')
})

test('messages: en and th render, level clamps', () => {
  expect(alertText({ id: 'heat', level: 2, value: 42 }, 'en').body).toContain('42°')
  expect(alertText({ id: 'heat', level: 2, value: 42 }, 'th').title).toBe('ร้อนจัด')
  expect(alertText({ id: 'umbrella', level: 3, value: 80 }, 'en').title).toBe('Carry an umbrella')
  expect(nowcastText({ kind: 'soon', minutes: 25 }, 'en')).toBe('Rain in about 25 min')
  expect(nowcastText({ kind: 'soon', minutes: 75 }, 'en')).toBe('Rain in about 1 h 15 min')
  expect(nowcastText({ kind: 'soon', minutes: 25 }, 'th')).toContain('25 นาที')
  expect(weatherLabel(63, 'th')).toBe('ฝนตก')
  expect(morningText({ placeName: 'Khon Kaen', temp: 28, code: 2, hi: 33, lo: 24, rainPct: 40 }, 'en').body).toContain('Partly cloudy')
})

import { hourlyChanged, hourlyDigest, kindOfCode, rainChance } from '../shared/rules.js'
import { hourlyText, rainChanceText } from '../shared/messages.js'

test('alerts: unstable air gives a level-1 storm risk; imminent storm stays level 2', () => {
  const unstable = [{ time: T0 + 3600_000, code: 3, cape: 3100, liftedIndex: -6 }]
  expect(alertsFor({ ...base, hourly: unstable })[0]).toMatchObject({ id: 'storm', level: 1 })
  const tame = [{ time: T0 + 3600_000, code: 3, cape: 1700, liftedIndex: -4.7 }]
  expect(alertsFor({ ...base, hourly: tame }).some((a) => a.id === 'storm')).toBe(false)
  expect(alertsFor({ ...base, hourly: [{ time: T0 + 3600_000, code: 95, cape: 3100, liftedIndex: -6 }] })[0]).toMatchObject({ id: 'storm', level: 2 })
})

test('alerts: wet-bulb humid heat levels, looking 6 h ahead', () => {
  expect(alertsFor({ ...base, current: { ...base.current, wetBulb: 27 } }).find((a) => a.id === 'humid')).toMatchObject({ level: 1, value: 27 })
  expect(alertsFor({ ...base, current: { ...base.current, wetBulb: 29 } }).find((a) => a.id === 'humid')?.level).toBe(2)
  const later = [{ time: T0 + 5 * 3600_000, code: 1, wetBulb: 30.5 }]
  expect(alertsFor({ ...base, hourly: later }).find((a) => a.id === 'humid')?.level).toBe(3)
  expect(alertsFor({ ...base, current: { ...base.current, wetBulb: 24.6 } }).some((a) => a.id === 'humid')).toBe(false)
})

test('rainChance: highest member share in the next 3 h', () => {
  const rp = [{ time: T0, p: 0.1 }, { time: T0 + 3600_000, p: 0.7 }, { time: T0 + 2 * 3600_000, p: 0.4 }, { time: T0 + 5 * 3600_000, p: 1 }]
  expect(rainChance(rp, T0 + 600_000)).toEqual({ time: T0 + 3600_000, p: 0.7 })
  expect(rainChance([], T0)).toBeNull()
  expect(rainChance(undefined, T0)).toBeNull()
})

test('kindOfCode groups WMO codes', () => {
  expect([0, 2, 3, 45, 53, 63, 81, 73, 95].map(kindOfCode)).toEqual(['clear', 'partly', 'cloudy', 'fog', 'drizzle', 'rain', 'rain', 'snow', 'thunder'])
})

test('hourlyChanged: only meaningful changes trigger a send', () => {
  const mk = (o: object = {}) => hourlyDigest({ temp: 30, code: 2, alerts: [], rainP: 0.1, ...o })
  const prev = mk()
  expect(hourlyChanged(undefined, prev)).toBe(true)
  expect(hourlyChanged(prev, mk({ temp: 31.5 }))).toBe(false)
  expect(hourlyChanged(prev, mk({ temp: 33 }))).toBe(true)
  expect(hourlyChanged(prev, mk({ code: 63 }))).toBe(true)
  expect(hourlyChanged(prev, mk({ rainP: 0.7 }))).toBe(true)
  expect(hourlyChanged(prev, mk({ alerts: [{ id: 'aqi', level: 2, value: 160 }] }))).toBe(true)
  expect(hourlyChanged(mk({ alerts: [{ id: 'aqi', level: 2, value: 160 }] }), mk({ alerts: [{ id: 'aqi', level: 2, value: 175 }] }))).toBe(false)
})

test('hourly text composes label, feels-like, rain chance and alert', () => {
  const rc = { p: 0.65, time: Date.parse('2026-10-03T08:00:00Z') }
  const t = hourlyText({ placeName: 'Khon Kaen', temp: 31, feels: 37, code: 2, rainRc: rc, offMin: 420, alertTitle: 'Extreme heat' }, 'en')
  expect(t.title).toBe('Khon Kaen · 31°')
  expect(t.body).toBe('Partly cloudy · feels 37° · 65% chance of rain around 15:00 · Extreme heat')
  expect(rainChanceText(rc, 420, 'th')).toBe('โอกาสฝน 65% ราว 15:00 น.')
  expect(hourlyText({ placeName: 'X', temp: 20, feels: 20, code: 0, rainRc: { p: 0.1, time: 0 }, offMin: 0 }, 'en').body).toBe('Clear sky')
})
