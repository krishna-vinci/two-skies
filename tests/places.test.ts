import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'
// @ts-expect-error plain JS module
import { cleanPlace, createPlacesStore } from '../server/places.mjs'
import { tzOffsetMin } from '../src/lib/tz'

test('tzOffsetMin: fixed zones and DST', () => {
  expect(tzOffsetMin('Asia/Kolkata')).toBe(330)
  expect(tzOffsetMin('Asia/Bangkok')).toBe(420)
  expect(tzOffsetMin('UTC')).toBe(0)
  expect(tzOffsetMin('America/New_York', new Date('2026-01-15T12:00:00Z'))).toBe(-300)
  expect(tzOffsetMin('America/New_York', new Date('2026-07-15T12:00:00Z'))).toBe(-240)
  expect(tzOffsetMin('Not/AZone')).toBe(0)
})

const good = { id: 'c:g1153671', name: 'Chiang Mai', subtitle: 'Chiang Mai, Thailand', lat: 18.7904, lon: 98.9847, tz: 'Asia/Bangkok' }

test('cleanPlace accepts a good place and rejects bad input', () => {
  expect(cleanPlace(good)).toMatchObject({ id: 'c:g1153671', lat: 18.7904, tz: 'Asia/Bangkok' })
  expect(cleanPlace({ ...good, id: 'khonkaen' })).toBeNull() // must be a custom id
  expect(cleanPlace({ ...good, lat: 95 })).toBeNull()
  expect(cleanPlace({ ...good, lon: 'x' })).toBeNull()
  expect(cleanPlace({ ...good, tz: 'Mars/Base' })).toBeNull()
  expect(cleanPlace({ ...good, name: '   ' })).toBeNull()
  expect(cleanPlace(null)).toBeNull()
})

function call(store: any, method: string, path: string, body?: unknown) {
  return new Promise<{ status: number; json: any }>((resolve) => {
    const res: any = {
      writeHead(status: number) { this.status = status },
      end(data: string) { resolve({ status: this.status, json: JSON.parse(data) }) },
    }
    const req: any = { method, headers: { 'content-type': 'application/json' } }
    store.handleApi(req, res, new URL(path, 'http://x'), async () => JSON.stringify(body ?? {}))
  })
}

test('store: add, list, update, remove, persist, and cap', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ts-places-'))
  const a = createPlacesStore({ dataDir: dir })
  await a.init()
  expect((await call(a, 'GET', '/api/places')).json.places).toEqual([])
  expect((await call(a, 'POST', '/api/places/add', { place: good })).status).toBe(200)
  expect((await call(a, 'POST', '/api/places/add', { place: { ...good, name: 'Chiang Mai City' } })).json.places).toHaveLength(1)
  expect((await call(a, 'POST', '/api/places/add', { place: { ...good, lat: 999 } })).status).toBe(400)

  const b = createPlacesStore({ dataDir: dir }) // fresh instance reads the saved file
  await b.init()
  expect(b.list[0].name).toBe('Chiang Mai City')

  expect((await call(b, 'POST', '/api/places/remove', { id: 'c:g1153671' })).json.places).toEqual([])
  for (let i = 0; i < 30; i++) await call(b, 'POST', '/api/places/add', { place: { ...good, id: `c:g${i}` } })
  expect((await call(b, 'POST', '/api/places/add', { place: { ...good, id: 'c:g99' } })).status).toBe(409)
})
