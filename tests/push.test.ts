import { mkdtemp, readFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'
// @ts-expect-error plain JS module
import { createPush } from '../server/push.mjs'

const OFF = 25200 // Chiang Mai UTC+7
const PLACES_FX = [
  { id: 'chiangmai', name: 'Chiang Mai', nameTh: 'เชียงใหม่', lat: 18.79, lon: 98.98, tz: 'Asia/Bangkok', utcOffsetMin: 420 },
  { id: 'bangkok', name: 'Bangkok', nameTh: 'กรุงเทพฯ', lat: 13.75, lon: 100.5, tz: 'Asia/Bangkok', utcOffsetMin: 420 },
]
const local = (ms: number) => new Date(ms + OFF * 1000).toISOString().slice(0, 16)

interface Opts {
  precip?: number[]
  aqi?: number | null
  code?: number
  feels?: number
  temp?: number
  rainP?: number // share of ensemble members that are wet
  cape?: number
  li?: number
  wetBulb?: number
}
function fakeFetch(now: number, o: Opts = {}) {
  return async (url: string) => {
    const hour0 = Math.floor(now / 3600000) * 3600000
    if (url.includes('air-quality')) return { current: { us_aqi: o.aqi ?? 40 } }
    if (url.includes('ensemble-api')) {
      const wet = Math.round((o.rainP ?? 0) * 10)
      const member = (i: number) => Array.from({ length: 6 }, () => (i < wet ? 1 : 0))
      const hourly: Record<string, unknown> = { time: Array.from({ length: 6 }, (_, i) => local(hour0 + i * 3600000)) }
      for (let i = 0; i < 10; i++) hourly[i === 0 ? 'precipitation' : `precipitation_member${String(i).padStart(2, '0')}`] = member(i)
      return { utc_offset_seconds: OFF, hourly }
    }
    const slot0 = Math.floor(now / 900000) * 900000
    const p = o.precip ?? [0, 0, 0, 0, 0, 0, 0, 0]
    const six = <T,>(v: T) => Array.from({ length: 6 }, () => v)
    return {
      utc_offset_seconds: OFF,
      current: { temperature_2m: o.temp ?? 30, apparent_temperature: o.feels ?? 33, is_day: 1, weather_code: o.code ?? 2, uv_index: 4, wet_bulb_temperature_2m: o.wetBulb ?? 24 },
      hourly: {
        time: Array.from({ length: 6 }, (_, i) => local(hour0 + i * 3600000)),
        weather_code: six(o.code ?? 2),
        cape: six(o.cape ?? 500),
        lifted_index: six(o.li ?? -1),
        wet_bulb_temperature_2m: six(o.wetBulb ?? 24),
      },
      daily: { weather_code: [2], temperature_2m_max: [34], temperature_2m_min: [25], apparent_temperature_max: [o.feels ?? 36], precipitation_probability_max: [20], uv_index_max: [6] },
      minutely_15: { time: p.map((_, i) => local(slot0 + i * 900000)), precipitation: p },
    }
  }
}

const subBody = (prefs: object, places = ['chiangmai'], endpoint = 'https://push.example/abc') => ({
  subscription: { endpoint, keys: { p256dh: 'k', auth: 'a' } },
  places,
  prefs,
  lang: 'en',
})

async function setup(now: number, o: Opts = {}, prefs: object = { rain: true, alerts: true, morning: true }, lang = 'en') {
  const dir = await mkdtemp(join(tmpdir(), 'ts-push-'))
  const sent: { payload: any }[] = []
  const clock = { t: now }
  const push = createPush({
    dataDir: dir,
    getPlaces: () => PLACES_FX,
    now: () => clock.t,
    fetchJson: (u: string) => fakeFetch(clock.t, o)(u),
    sendFn: async (_sub: unknown, payload: any) => { sent.push({ payload }) },
  })
  await push.init()
  await push.subscribe({ ...subBody(prefs), lang })
  return { push, sent, dir, clock, o }
}

const NOON_ICT = Date.parse('2026-10-03T05:00:00Z') // 12:00 in Chiang Mai

test('rain soon pushes once, then is deduped', async () => {
  const { push, sent } = await setup(NOON_ICT, { precip: [0, 0, 0.6, 0.8, 0, 0, 0, 0] }, { rain: true })
  expect(await push.tick()).toBe(1)
  expect(sent[0].payload.body).toMatch(/Rain in about \d+ min/)
  expect(sent[0].payload.title).toBe('Chiang Mai')
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
    getPlaces: () => PLACES_FX,
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
  const e = await push.subscribe(subBody({ rain: true }, ['chiangmai', 'nowhere', 'bangkok'], 'https://push.example/zzz'))
  expect(e.places).toEqual(['chiangmai', 'bangkok'])
  const saved = JSON.parse(await readFile(join(dir, 'push.json'), 'utf8'))
  expect(saved.vapid.publicKey.length).toBeGreaterThan(40)
  expect(Object.keys(saved.subs)).toHaveLength(2)
  expect(((await stat(join(dir, 'push.json'))).mode & 0o777).toString(8)).toBe('600')
})

const T_0905 = Date.parse('2026-10-03T02:05:00Z') // 09:05 in Chiang Mai

test('hourly update: sends on the hour window with a replace-tag, once per hour', async () => {
  const { push, sent, clock } = await setup(T_0905, { rainP: 0.7 }, { hourly: true })
  expect(await push.tick()).toBe(1)
  expect(sent[0].payload.title).toBe('Chiang Mai · 30°')
  expect(sent[0].payload.tag).toBe('hourly-chiangmai')
  expect(sent[0].payload.body).toContain('70% chance of rain around')
  expect(await push.tick()).toBe(0) // same hour
  clock.t += 3600_000
  expect(await push.tick()).toBe(1) // next hour
  expect(sent[1].payload.tag).toBe('hourly-chiangmai')
})

test('hourly update: not outside 07:00-22:59 local or late in the hour', async () => {
  const early = await setup(Date.parse('2026-10-02T23:05:00Z'), {}, { hourly: true }) // 06:05 ICT
  expect(await early.push.tick()).toBe(0)
  const late = await setup(Date.parse('2026-10-03T16:05:00Z'), {}, { hourly: true }) // 23:05 ICT
  expect(await late.push.tick()).toBe(0)
  const mid = await setup(Date.parse('2026-10-03T02:40:00Z'), {}, { hourly: true }) // 09:40 ICT
  expect(await mid.push.tick()).toBe(0)
})

test('hourly update, only-when-changed: first send, then quiet until something moves', async () => {
  const { push, sent, clock, o } = await setup(T_0905, {}, { hourly: true, hourlyChanged: true })
  expect(await push.tick()).toBe(1)
  clock.t += 3600_000
  expect(await push.tick()).toBe(0) // identical conditions
  clock.t += 3600_000
  o.temp = 34 // +4 degrees
  expect(await push.tick()).toBe(1)
  expect(sent).toHaveLength(2)
  expect(sent[1].payload.title).toBe('Chiang Mai · 34°')
})

test('hourly update in Thai includes the Thai weather label', async () => {
  const { push, sent } = await setup(T_0905, { code: 63 }, { hourly: true }, 'th')
  expect(await push.tick()).toBe(1)
  expect(sent[0].payload.body).toContain('ฝนตก')
})

test('humid heat (wet-bulb 28.5) pushes; unstable air (storm risk) does not', async () => {
  const humid = await setup(NOON_ICT, { wetBulb: 28.5 }, { alerts: true })
  expect(await humid.push.tick()).toBe(1)
  expect(humid.sent[0].payload.title).toContain('Very humid heat')
  const unstable = await setup(NOON_ICT, { cape: 3200, li: -6 }, { alerts: true })
  expect(await unstable.push.tick()).toBe(0)
})
