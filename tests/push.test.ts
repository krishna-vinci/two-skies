import { mkdtemp, readFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'
// @ts-expect-error plain JS module
import { createPush } from '../server/push.mjs'

const OFF = 25200 // Khon Kaen UTC+7
const local = (ms: number) => new Date(ms + OFF * 1000).toISOString().slice(0, 16)

interface Opts { precip?: number[]; aqi?: number | null; code?: number; feels?: number }
function fakeFetch(now: number, o: Opts = {}) {
  return async (url: string) => {
    if (url.includes('air-quality')) return { current: { us_aqi: o.aqi ?? 40 } }
    const slot0 = Math.floor(now / 900000) * 900000
    const p = o.precip ?? [0, 0, 0, 0, 0, 0, 0, 0]
    return {
      utc_offset_seconds: OFF,
      current: { temperature_2m: 30, apparent_temperature: o.feels ?? 33, is_day: 1, weather_code: o.code ?? 2, uv_index: 4 },
      hourly: { time: [local(Math.floor(now / 3600000) * 3600000)], weather_code: [o.code ?? 2] },
      daily: { weather_code: [2], temperature_2m_max: [34], temperature_2m_min: [25], apparent_temperature_max: [o.feels ?? 36], precipitation_probability_max: [20], uv_index_max: [6] },
      minutely_15: { time: p.map((_, i) => local(slot0 + i * 900000)), precipitation: p },
    }
  }
}

const subBody = (prefs: object, places = ['khonkaen'], endpoint = 'https://push.example/abc') => ({
  subscription: { endpoint, keys: { p256dh: 'k', auth: 'a' } },
  places,
  prefs,
  lang: 'en',
})

async function setup(now: number, o: Opts = {}, prefs: object = { rain: true, alerts: true, morning: true }) {
  const dir = await mkdtemp(join(tmpdir(), 'ts-push-'))
  const sent: { payload: any }[] = []
  const clock = { t: now }
  const push = createPush({
    dataDir: dir,
    now: () => clock.t,
    fetchJson: fakeFetch(now, o),
    sendFn: async (_sub: unknown, payload: any) => { sent.push({ payload }) },
  })
  await push.init()
  await push.subscribe(subBody(prefs))
  return { push, sent, dir, clock }
}

const NOON_ICT = Date.parse('2026-10-03T05:00:00Z') // 12:00 in Khon Kaen

test('rain soon pushes once, then is deduped', async () => {
  const { push, sent } = await setup(NOON_ICT, { precip: [0, 0, 0.6, 0.8, 0, 0, 0, 0] }, { rain: true })
  expect(await push.tick()).toBe(1)
  expect(sent[0].payload.body).toMatch(/Rain in about \d+ min/)
  expect(sent[0].payload.title).toBe('Khon Kaen')
  expect(await push.tick()).toBe(0)
})

test('no push when the next hour is dry', async () => {
  const { push } = await setup(NOON_ICT, {}, { rain: true })
  expect(await push.tick()).toBe(0)
})

test('alerts: unhealthy air pushes, merely sensitive-group air does not', async () => {
  const bad = await setup(NOON_ICT, { aqi: 180 }, { alerts: true })
  expect(await bad.push.tick()).toBe(1)
  expect(bad.sent[0].payload.body).toContain('mask')
  const mild = await setup(NOON_ICT, { aqi: 120 }, { alerts: true })
  expect(await mild.push.tick()).toBe(0)
})

test('alerts: extreme heat pushes', async () => {
  const { push, sent } = await setup(NOON_ICT, { feels: 43 }, { alerts: true })
  expect(await push.tick()).toBe(1)
  expect(sent[0].payload.title).toContain('Extreme heat')
})

test('morning summary only inside 07:30-08:30 local, once per day', async () => {
  const morning = Date.parse('2026-10-03T00:45:00Z') // 07:45 ICT
  const m = await setup(morning, {}, { morning: true })
  expect(await m.push.tick()).toBe(1)
  expect(m.sent[0].payload.body).toContain('High 34°')
  expect(await m.push.tick()).toBe(0)
  const noon = await setup(NOON_ICT, {}, { morning: true })
  expect(await noon.push.tick()).toBe(0)
})

test('expired subscriptions (410) are removed', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ts-push-'))
  const push = createPush({
    dataDir: dir,
    now: () => NOON_ICT,
    fetchJson: fakeFetch(NOON_ICT, { precip: [0, 0, 0.9, 0, 0, 0, 0, 0] }),
    sendFn: async () => { throw Object.assign(new Error('gone'), { statusCode: 410 }) },
  })
  await push.init()
  await push.subscribe(subBody({ rain: true }))
  expect(Object.keys(push.state.subs)).toHaveLength(1)
  await push.tick()
  expect(Object.keys(push.state.subs)).toHaveLength(0)
})

test('subscribe validates input and persists with private permissions', async () => {
  const { push, dir } = await setup(NOON_ICT)
  expect(await push.subscribe({ subscription: { endpoint: 'http://insecure', keys: { p256dh: 'k', auth: 'a' } } })).toBeNull()
  const e = await push.subscribe(subBody({ rain: true }, ['khonkaen', 'nowhere', 'bangkok'], 'https://push.example/zzz'))
  expect(e.places).toEqual(['khonkaen', 'bangkok'])
  const saved = JSON.parse(await readFile(join(dir, 'push.json'), 'utf8'))
  expect(saved.vapid.publicKey.length).toBeGreaterThan(40)
  expect(Object.keys(saved.subs)).toHaveLength(2)
  expect(((await stat(join(dir, 'push.json'))).mode & 0o777).toString(8)).toBe('600')
})
