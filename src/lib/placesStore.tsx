import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useConfig } from './config'
import type { Place, StoredPlace } from './types'
import { tzOffsetMin } from './tz'

const CACHE = 'ts.customPlaces'

const toPlace = (r: StoredPlace): Place => ({ ...r, utcOffsetMin: tzOffsetMin(r.tz) })

function loadCache(): StoredPlace[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE) ?? '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

async function api(path: string, body?: unknown): Promise<StoredPlace[] | null> {
  try {
    const r = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    })
    if (!r.ok) return null
    return ((await r.json()) as { places: StoredPlace[] }).places
  } catch {
    return null
  }
}

interface Ctx {
  /** Our configured cities first, then added places */
  all: Place[]
  custom: Place[]
  byId: (id: string) => Place | undefined
  add: (r: StoredPlace) => Promise<void>
  remove: (id: string) => Promise<void>
}
const PlacesContext = createContext<Ctx | null>(null)

export function PlacesProvider({ children }: { children: ReactNode }) {
  const { ourCities } = useConfig()
  const [records, setRecords] = useState<StoredPlace[]>(loadCache)

  // server list is shared between devices and wins when reachable
  useEffect(() => {
    let live = true
    api('/api/places').then((list) => live && list && setRecords(list))
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(CACHE, JSON.stringify(records))
    } catch {
      /* storage unavailable */
    }
  }, [records])

  const add = useCallback(async (r: StoredPlace) => {
    setRecords((prev) => [...prev.filter((x) => x.id !== r.id), r])
    const list = await api('/api/places/add', { place: r })
    if (list) setRecords(list)
  }, [])

  const remove = useCallback(async (id: string) => {
    setRecords((prev) => prev.filter((x) => x.id !== id))
    const list = await api('/api/places/remove', { id })
    if (list) setRecords(list)
  }, [])

  const value = useMemo<Ctx>(() => {
    const custom = records.map(toPlace)
    const all = [...ourCities, ...custom]
    return { all, custom, byId: (id) => all.find((p) => p.id === id), add, remove }
  }, [records, ourCities, add, remove])

  return <PlacesContext.Provider value={value}>{children}</PlacesContext.Provider>
}

export function usePlaces(): Ctx {
  const c = useContext(PlacesContext)
  if (!c) throw new Error('PlacesProvider missing')
  return c
}
