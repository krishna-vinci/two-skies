import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { EXAMPLE_CONFIG } from './examples'
import type { AppConfig, Place, Side, StoredPlace } from './types'
import { tzOffsetMin } from './tz'

const CACHE = 'ts.config'

export interface SideView {
  id: Side
  label?: string
  places: Place[]
}

interface Ctx {
  /** loading: waiting for the server and nothing cached yet */
  status: 'loading' | 'ready'
  /** false on a fresh install: the welcome screen runs */
  configured: boolean
  /** true when there is no server (npm run dev): example cities, nothing is saved */
  demo: boolean
  config: AppConfig | null
  sides: [SideView, SideView]
  awake: { from: number; to: number }
  /** Every configured city, both sides */
  ourCities: Place[]
  save: (c: AppConfig) => Promise<boolean>
}

const ConfigContext = createContext<Ctx | null>(null)

const toPlace = (r: StoredPlace): Place => ({ ...r, utcOffsetMin: tzOffsetMin(r.tz) })

function loadCache(): AppConfig | null {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE) ?? 'null')
    return c?.sides?.length === 2 ? c : null
  } catch {
    return null
  }
}
const writeCache = (c: AppConfig | null) => {
  try {
    if (c) localStorage.setItem(CACHE, JSON.stringify(c))
    else localStorage.removeItem(CACHE)
  } catch {
    /* storage unavailable */
  }
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const cached = useMemo(loadCache, [])
  const [config, setConfig] = useState<AppConfig | null>(cached)
  const [configured, setConfigured] = useState(!!cached)
  const [status, setStatus] = useState<'loading' | 'ready'>(cached ? 'ready' : 'loading')
  const [demo, setDemo] = useState(false)

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const r = await fetch('/api/config', { credentials: 'same-origin' })
        const isJson = r.ok && (r.headers.get('content-type') ?? '').includes('json')
        if (!isJson) throw new Error('no config api')
        const j = (await r.json()) as { configured: boolean; config: AppConfig | null }
        if (!live) return
        setConfigured(j.configured)
        setConfig(j.config)
        writeCache(j.config)
      } catch {
        if (!live) return
        // offline or no server: use what we cached, else run the example setup
        if (!cached) {
          setConfig(EXAMPLE_CONFIG)
          setConfigured(true)
          setDemo(true)
        }
      }
      if (live) setStatus('ready')
    })()
    return () => {
      live = false
    }
  }, [cached])

  const save = useCallback(
    async (next: AppConfig) => {
      if (demo) {
        setConfig(next)
        return true
      }
      try {
        const r = await fetch('/api/config', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ config: next }),
          credentials: 'same-origin',
        })
        if (!r.ok) return false
        const j = (await r.json()) as { config: AppConfig }
        setConfig(j.config)
        setConfigured(true)
        writeCache(j.config)
        return true
      } catch {
        return false
      }
    },
    [demo],
  )

  const value = useMemo<Ctx>(() => {
    const c = config ?? EXAMPLE_CONFIG
    const sides = c.sides.map((s, i) => ({ id: (i === 0 ? 'a' : 'b') as Side, label: s.label, places: s.places.map(toPlace) })) as [SideView, SideView]
    return { status, configured, demo, config, sides, awake: c.awake, ourCities: sides.flatMap((s) => s.places), save }
  }, [config, configured, demo, status, save])

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}

export function useConfig(): Ctx {
  const c = useContext(ConfigContext)
  if (!c) throw new Error('ConfigProvider missing')
  return c
}
