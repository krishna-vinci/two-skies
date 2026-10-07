// The couple's setup: two sides, each with 1-3 cities, plus waking hours.
// Lives in the data dir so it is shared by every device and survives upgrades.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tzOffsetMin } from '../shared/tz.js'
import { cleanPlace, str } from './places.mjs'

const CITY_ID = /^[\w][\w:.-]{0,39}$/
export const MAX_CITIES_PER_SIDE = 3

/** Returns a clean config or null. */
export function cleanConfig(c) {
  if (!c || !Array.isArray(c.sides) || c.sides.length !== 2) return null
  const seen = new Set()
  const sides = []
  for (const s of c.sides) {
    const places = (Array.isArray(s?.places) ? s.places : []).map((p) => cleanPlace(p, CITY_ID))
    if (places.length < 1 || places.length > MAX_CITIES_PER_SIDE || places.some((p) => !p)) return null
    for (const p of places) {
      if (seen.has(p.id)) return null
      seen.add(p.id)
    }
    sides.push({ label: str(s.label, 30), places })
  }
  const from = Number(c.awake?.from ?? 7)
  const to = Number(c.awake?.to ?? 23)
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to > 24 || from >= to) return null
  return { sides, awake: { from, to } }
}

export function createConfigStore({ dataDir }) {
  const file = join(dataDir, 'config.json')
  let config = null
  let saving = Promise.resolve()

  const save = () => {
    saving = saving.then(async () => {
      await mkdir(dataDir, { recursive: true })
      const tmp = `${file}.tmp`
      await writeFile(tmp, JSON.stringify(config, null, 2))
      await rename(tmp, file)
    })
    return saving
  }

  async function init() {
    try {
      config = cleanConfig(JSON.parse(await readFile(file, 'utf8')))
    } catch {
      /* not configured yet */
    }
  }

  /** Every configured city with a live UTC offset: what push alerts watch. */
  const places = () =>
    (config?.sides ?? []).flatMap((s) => s.places).map((p) => ({ ...p, utcOffsetMin: tzOffsetMin(p.tz) }))

  async function handleApi(req, res, url, readBody) {
    const json = (status, obj) => {
      res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      res.end(JSON.stringify(obj))
    }
    if (req.method === 'GET' && url.pathname === '/api/config') return json(200, { configured: !!config, config })
    if (req.method === 'POST' && url.pathname === '/api/config') {
      if (!(req.headers['content-type'] ?? '').includes('application/json')) return json(415, { error: 'json only' })
      let body
      try {
        body = JSON.parse(await readBody(req))
      } catch {
        return json(400, { error: 'bad json' })
      }
      const clean = cleanConfig(body?.config)
      if (!clean) return json(400, { error: 'bad config' })
      config = clean
      await save()
      return json(200, { configured: true, config })
    }
    return json(405, { error: 'method' })
  }

  return { init, handleApi, places, get config() { return config } }
}
