import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'
// @ts-expect-error plain JS module
import { cleanConfig, createConfigStore } from '../server/config.mjs'

const city = (id: string, tz = 'Europe/Lisbon') => ({ id, name: id.toUpperCase(), lat: 38.7, lon: -9.1, tz })
const good = {
  sides: [
    { label: 'Ana', places: [city('lis'), city('opo')] },
    { label: 'Ben', places: [city('tok', 'Asia/Tokyo')] },
  ],
  awake: { from: 8, to: 23 },
}

test('cleanConfig accepts a good config and defaults the waking hours', () => {
  expect(cleanConfig(good)).toMatchObject({ sides: [{ label: 'Ana' }, { label: 'Ben' }], awake: { from: 8, to: 23 } })
  const noAwake = cleanConfig({ sides: good.sides })
  expect(noAwake.awake).toEqual({ from: 7, to: 23 })
  expect(cleanConfig({ sides: [{ places: [city('a')] }, { places: [city('b')] }] }).sides[0].label).toBeUndefined()
})

test('cleanConfig rejects bad shapes', () => {
  expect(cleanConfig(null)).toBeNull()
  expect(cleanConfig({ sides: [good.sides[0]] })).toBeNull() // needs exactly two sides
  expect(cleanConfig({ sides: [{ places: [] }, good.sides[1]] })).toBeNull() // at least one city
  expect(cleanConfig({ sides: [{ places: [1, 2, 3, 4].map((i) => city(`c${i}`)) }, good.sides[1]] })).toBeNull() // at most three
  expect(cleanConfig({ sides: [{ places: [city('x')] }, { places: [city('x')] }] })).toBeNull() // ids unique across sides
  expect(cleanConfig({ sides: [{ places: [{ ...city('x'), tz: 'Mars/Base' }] }, good.sides[1]] })).toBeNull()
  expect(cleanConfig({ sides: [{ places: [{ ...city('has space') }] }, good.sides[1]] })).toBeNull()
  expect(cleanConfig({ ...good, awake: { from: 23, to: 7 } })).toBeNull()
  expect(cleanConfig({ ...good, awake: { from: 7.5, to: 23 } })).toBeNull()
})

function call(store: any, method: string, body?: unknown) {
  return new Promise<{ status: number; json: any }>((resolve) => {
    const res: any = { writeHead(s: number) { this.status = s }, end(d: string) { resolve({ status: this.status, json: JSON.parse(d) }) } }
    const req: any = { method, headers: { 'content-type': 'application/json' } }
    store.handleApi(req, res, new URL('/api/config', 'http://x'), async () => JSON.stringify(body ?? {}))
  })
}

test('store: unconfigured -> save -> persists across instances; places() carries live offsets', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ts-config-'))
  const a = createConfigStore({ dataDir: dir })
  await a.init()
  expect((await call(a, 'GET')).json).toEqual({ configured: false, config: null })
  expect(a.places()).toEqual([])

  expect((await call(a, 'POST', { config: { sides: [] } })).status).toBe(400)
  const saved = await call(a, 'POST', { config: good })
  expect(saved.status).toBe(200)
  expect(saved.json.configured).toBe(true)

  const b = createConfigStore({ dataDir: dir })
  await b.init()
  expect(b.config.sides[1].label).toBe('Ben')
  const places = b.places()
  expect(places.map((p: any) => p.id)).toEqual(['lis', 'opo', 'tok'])
  expect(places[2].utcOffsetMin).toBe(540) // Tokyo
})
