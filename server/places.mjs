// Shared list of extra (browse-only) places. No push alerts are ever sent for these.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const MAX_PLACES = 30
const ADDED_ID = /^c:[\w.-]{1,40}$/ // browse-only places added on the Places page

const validTz = (tz) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz })
    return true
  } catch {
    return false
  }
}
export const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined)

/** Returns a clean record or null. `idRe` decides which ids are acceptable. */
export function cleanPlace(p, idRe = ADDED_ID) {
  if (!p || typeof p.id !== 'string' || !idRe.test(p.id)) return null
  const name = str(p.name, 60)
  const lat = Number(p.lat)
  const lon = Number(p.lon)
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  if (typeof p.tz !== 'string' || !validTz(p.tz)) return null
  return {
    id: p.id,
    name,
    nameTh: str(p.nameTh, 60),
    subtitle: str(p.subtitle, 80),
    lat: Math.round(lat * 1e4) / 1e4,
    lon: Math.round(lon * 1e4) / 1e4,
    tz: p.tz,
  }
}

export function createPlacesStore({ dataDir }) {
  const file = join(dataDir, 'places.json')
  let list = []
  let saving = Promise.resolve()

  const save = () => {
    saving = saving.then(async () => {
      await mkdir(dataDir, { recursive: true })
      const tmp = `${file}.tmp`
      await writeFile(tmp, JSON.stringify(list))
      await rename(tmp, file)
    })
    return saving
  }

  async function init() {
    try {
      const raw = JSON.parse(await readFile(file, 'utf8'))
      list = (Array.isArray(raw) ? raw : []).map((p) => cleanPlace(p)).filter(Boolean)
    } catch {
      /* first run */
    }
  }

  async function handleApi(req, res, url, readBody) {
    const json = (status, obj) => {
      res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      res.end(JSON.stringify(obj))
    }
    if (req.method === 'GET' && url.pathname === '/api/places') return json(200, { places: list })
    if (req.method !== 'POST') return json(405, { error: 'method' })
    if (!(req.headers['content-type'] ?? '').includes('application/json')) return json(415, { error: 'json only' })
    let body
    try {
      body = JSON.parse(await readBody(req))
    } catch {
      return json(400, { error: 'bad json' })
    }
    if (url.pathname === '/api/places/add') {
      const p = cleanPlace(body?.place)
      if (!p) return json(400, { error: 'bad place' })
      const i = list.findIndex((x) => x.id === p.id)
      if (i >= 0) list[i] = p
      else if (list.length >= MAX_PLACES) return json(409, { error: 'too many places' })
      else list.push(p)
      await save()
      return json(200, { places: list })
    }
    if (url.pathname === '/api/places/remove') {
      list = list.filter((x) => x.id !== body?.id)
      await save()
      return json(200, { places: list })
    }
    return json(404, { error: 'not found' })
  }

  return { init, handleApi, get list() { return list } }
}
