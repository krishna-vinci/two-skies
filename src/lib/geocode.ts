import type { StoredPlace } from './types'

export interface GeoResult {
  id: number
  name: string
  latitude: number
  longitude: number
  timezone?: string
  country?: string
  admin1?: string
  population?: number
}

const fold = (x: string) => x.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/**
 * The geocoder fuzzy-matches, so a short prefix returns noise. Names that start with
 * what was typed come first, then bigger places first; the API order breaks ties.
 */
export function rankResults(term: string, results: GeoResult[]): GeoResult[] {
  const t = fold(term.trim())
  return results
    .map((r, i) => ({ r, i, starts: fold(r.name).startsWith(t) ? 0 : 1 }))
    .sort((a, b) => a.starts - b.starts || (b.r.population ?? 0) - (a.r.population ?? 0) || a.i - b.i)
    .map((x) => x.r)
}

/** Id prefix: `c` = added (browse-only) place, `p` = one of our configured cities. */
export type IdPrefix = 'c' | 'p'

/** Open-Meteo geocoding hit -> stored place (needs a timezone). */
export function resultToRecord(r: GeoResult, prefix: IdPrefix = 'c'): StoredPlace | null {
  if (!r.timezone) return null
  return {
    id: `${prefix}:g${r.id}`,
    name: r.name,
    subtitle: [r.admin1, r.country].filter((x) => x && x !== r.name).join(', ') || undefined,
    lat: r.latitude,
    lon: r.longitude,
    tz: r.timezone,
  }
}

export function manualRecord(name: string, lat: number, lon: number, tz: string, prefix: IdPrefix = 'c'): StoredPlace {
  return { id: `${prefix}:m${lat.toFixed(3)}_${lon.toFixed(3)}`, name: name.trim(), lat, lon, tz }
}

export async function searchCities(q: string, lang: string, signal?: AbortSignal, prefix: IdPrefix = 'c'): Promise<StoredPlace[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=40&language=${lang}`
  const r = await fetch(url, { signal })
  if (!r.ok) throw new Error(`geocoding ${r.status}`)
  const j = (await r.json()) as { results?: GeoResult[] }
  return rankResults(q, j.results ?? [])
    .map((r) => resultToRecord(r, prefix))
    .filter((x): x is StoredPlace => x !== null)
    .slice(0, 8)
}

/** Timezone for arbitrary coordinates (the forecast API resolves it with timezone=auto). */
export async function resolveTz(lat: number, lon: number): Promise<string> {
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&timezone=auto`)
  if (!r.ok) throw new Error(`forecast ${r.status}`)
  const j = (await r.json()) as { timezone?: string }
  if (!j.timezone) throw new Error('no timezone')
  return j.timezone
}

/**
 * Search shows names in the UI language, but we store the English name as the default so a
 * city reads sensibly everywhere. Other languages are looked up on demand (see placeNames.ts).
 */
export async function withEnglishName(rec: StoredPlace): Promise<StoredPlace> {
  const m = rec.id.match(/:g(\d+)$/)
  if (!m) return rec
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/get?id=${m[1]}&language=en`)
    if (!r.ok) throw new Error(`geocoding ${r.status}`)
    const j = (await r.json()) as { name?: string; admin1?: string; country?: string }
    if (!j.name) return rec
    const subtitle = [j.admin1, j.country].filter((x) => x && x !== j.name).join(', ') || undefined
    return { ...rec, name: j.name, subtitle }
  } catch {
    return rec
  }
}
