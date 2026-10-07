// City names in the user's language, looked up on demand from Open-Meteo's geocoder and cached.
// Only places that carry a geocoder id (".../g12345") can be looked up; others keep the stored name.
import type { Place } from './types'

export interface NameEntry {
  name: string
  subtitle?: string
}

const KEY = 'ts.placeNames.v1'
const cache = new Map<string, NameEntry>()
const failed = new Set<string>() // don't retry within a session
const inflight = new Map<string, Promise<void>>()
const listeners = new Set<() => void>()
let version = 0

try {
  const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, NameEntry>
  for (const [k, v] of Object.entries(raw)) if (v?.name) cache.set(k, v)
} catch {
  /* storage unavailable or corrupt */
}

const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(cache)))
  } catch {
    /* ignore */
  }
}
const bump = () => {
  version++
  listeners.forEach((l) => l())
}

export const geoIdOf = (placeId: string): string | undefined => placeId.match(/:g(\d+)$/)?.[1]
const keyOf = (placeId: string, lang: string) => `${geoIdOf(placeId)}:${lang}`

/** Sync read, used while rendering. */
export function cachedName(placeId: string, lang: string): NameEntry | undefined {
  return geoIdOf(placeId) ? cache.get(keyOf(placeId, lang)) : undefined
}

/** Remember a name we already know (for example a search result shown in the UI language). */
export function seedName(placeId: string, lang: string, entry: NameEntry) {
  if (!geoIdOf(placeId) || !entry.name) return
  cache.set(keyOf(placeId, lang), entry)
  persist()
  bump()
}

export const subscribeNames = (fn: () => void) => {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}
export const namesVersion = () => version

const subtitleOf = (j: { name?: string; admin1?: string; country?: string }) =>
  [j.admin1, j.country].filter((x) => x && x !== j.name).join(', ') || undefined

async function fetchOne(placeId: string, lang: string) {
  const k = keyOf(placeId, lang)
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/get?id=${geoIdOf(placeId)}&language=${encodeURIComponent(lang)}`)
    if (!r.ok) throw new Error(String(r.status))
    const j = (await r.json()) as { name?: string; admin1?: string; country?: string }
    if (!j.name) throw new Error('no name')
    cache.set(k, { name: j.name, subtitle: subtitleOf(j) })
    persist()
    bump()
  } catch {
    failed.add(k)
  }
}

/** Fetch whatever names are missing for `lang`. English is the stored default, so it is never fetched. */
export async function ensureNames(places: Pick<Place, 'id'>[], lang: string): Promise<void> {
  if (lang === 'en') return
  const todo = places.filter((p) => {
    if (!geoIdOf(p.id)) return false
    const k = keyOf(p.id, lang)
    return !cache.has(k) && !failed.has(k)
  })
  const unique = [...new Map(todo.map((p) => [p.id, p])).values()]
  for (let i = 0; i < unique.length; i += 6) {
    await Promise.all(
      unique.slice(i, i + 6).map((p) => {
        const k = keyOf(p.id, lang)
        if (!inflight.has(k)) inflight.set(k, fetchOne(p.id, lang).finally(() => inflight.delete(k)))
        return inflight.get(k)
      }),
    )
  }
}
