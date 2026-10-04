import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { weatherLabel } from '../../shared/messages.js'
import { Chevron, Close, Pin, WeatherIcon } from './icons'
import { PullIndicator } from './PullIndicator'
import { localTime } from '../lib/couple'
import { manualRecord, resolveTz, searchCities } from '../lib/geocode'
import { useNow } from '../lib/hooks'
import { placeLabels, useI18n } from '../lib/i18n'
import { usePlaces } from '../lib/placesStore'
import type { Place, StoredPlace } from '../lib/types'
import { usePullToRefresh } from '../lib/usePullToRefresh'
import { useWeather } from '../lib/useWeather'
import { describeWeather } from '../lib/weatherCodes'
import { rgba } from '../sky/layers/util'
import { useSky } from '../sky/useSky'

/** One added place: a tile tinted with that place's live sky colours. */
function PlaceCard({ place, onOpen, onRemove }: { place: Place; onOpen: (rect: DOMRect) => void; onRemove: () => void }) {
  const { t, lang } = useI18n()
  const w = useWeather(place).data
  const sky = useSky(place, w)
  const now = useNow(30_000)
  const labels = placeLabels(place, lang)
  const kind = w ? describeWeather(w.current.code).kind : null
  return (
    <li className="relative">
      <button
        onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
        className="relative block w-full overflow-hidden rounded-[26px] border border-white/15 p-4 pr-12 text-left shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition active:scale-[0.99]"
        style={{ background: `linear-gradient(170deg, ${rgba(sky.top)}, ${rgba(sky.mid)} 55%, ${rgba(sky.bottom)})`, minHeight: 112 }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
        <div className="relative flex items-start justify-between gap-3 text-soft-shadow">
          <div className="min-w-0 pr-8">
            <div className="truncate text-xl font-light leading-tight">{labels.title}</div>
            <div className="truncate text-sm font-light text-white/75">{labels.sub || ' '}</div>
            <div className="mt-2 text-xs tabular-nums text-white/70">
              {localTime(now, place)} {t('localSuffix')}
            </div>
          </div>
          {w && kind ? (
            <div className="shrink-0 text-right">
              <div className="text-5xl font-extralight leading-none tracking-tight tabular-nums">{Math.round(w.current.temp)}°</div>
              <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[13px] font-light">
                <WeatherIcon kind={kind} isDay={w.current.isDay} size={16} />
                {weatherLabel(w.current.code, lang)}
              </div>
              <div className="text-xs font-light text-white/70">
                {t('high')} {Math.round(w.daily[0].tMax)}° {t('low')} {Math.round(w.daily[0].tMin)}°
              </div>
            </div>
          ) : (
            <div className="h-14 w-24 animate-pulse rounded-2xl bg-white/15" />
          )}
        </div>
      </button>
      <button
        onClick={onRemove}
        aria-label={t('removePlace')}
        className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/25 text-white/80 backdrop-blur transition hover:bg-black/45"
      >
        <Close size={14} />
      </button>
    </li>
  )
}

/** Full page for browsing extra cities. Nothing here affects the home screen or alerts. */
export function PlacesPage({ onOpenPlace, onClose }: { onOpenPlace: (place: Place, rect: DOMRect) => void; onClose: () => void }) {
  const { t, lang } = useI18n()
  const { custom, add, remove } = usePlaces()
  const scroller = useRef<HTMLDivElement>(null)
  const ptr = usePullToRefresh(scroller, true)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<StoredPlace[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [manual, setManual] = useState(false)
  const [m, setM] = useState({ name: '', lat: '', lon: '' })

  // debounced type-ahead search; stale requests are aborted
  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setResults(null)
      setBusy(false)
      setError('')
      return
    }
    setBusy(true)
    const ctl = new AbortController()
    const id = setTimeout(() => {
      searchCities(term, lang, ctl.signal)
        .then((r) => {
          setResults(r)
          setError('')
          setBusy(false)
        })
        .catch((e) => {
          if (e?.name === 'AbortError') return
          setError(t('searchFailed'))
          setBusy(false)
        })
    }, 300)
    return () => {
      clearTimeout(id)
      ctl.abort()
    }
  }, [q, lang, t])

  const addAndStay = async (r: StoredPlace) => {
    await add(r)
    setQ('')
    setResults(null)
    setManual(false)
    setM({ name: '', lat: '', lon: '' })
    scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submitManual = async () => {
    const lat = Number(m.lat)
    const lon = Number(m.lon)
    const ok = m.name.trim() && m.lat.trim() !== '' && m.lon.trim() !== '' && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
    if (!ok) return setError(t('coordsInvalid'))
    setBusy(true)
    setError('')
    try {
      await addAndStay(manualRecord(m.name, lat, lon, await resolveTz(lat, lon)))
    } catch {
      setError(t('searchFailed'))
    }
    setBusy(false)
  }

  const input = 'w-full rounded-2xl border border-white/20 bg-black/25 px-4 py-3 text-[15px] font-light outline-none placeholder:text-white/40 focus:border-white/50'
  const known = new Set(custom.map((p) => p.id))

  return (
    <motion.div
      className="fixed inset-0 z-40 bg-[#0b1020]"
      style={{ background: 'radial-gradient(120% 70% at 20% 0%, #26397a 0%, transparent 60%), radial-gradient(100% 60% at 100% 100%, #4a2a55 0%, transparent 60%), #0b1020' }}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 28 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <PullIndicator {...ptr} />
      <div ref={scroller} className="h-full overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-2xl px-4 pb-16 pt-[max(1rem,env(safe-area-inset-top))] md:px-8">
          <div className="flex items-center gap-3">
            <button onClick={onClose} aria-label={t('back')} className="glass flex h-11 w-11 shrink-0 items-center justify-center" style={{ borderRadius: 999 }}>
              <Chevron />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl font-light tracking-tight">{t('places')}</h1>
              <p className="truncate text-sm font-light text-white/60">{t('placesSub')}</p>
            </div>
          </div>

          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchPlace')} aria-label={t('searchPlace')} className={`${input} mt-5`} />

          {q.trim().length >= 2 && (
            <div className="mt-2">
              {busy && !results && <div className="px-1 py-2 text-sm font-light text-white/60">{t('searching')}</div>}
              {results && results.length > 0 && (
                <ul className="space-y-0.5">
                  {results.map((r) => {
                    const l = placeLabels({ ...r, owner: null, utcOffsetMin: 0 }, lang)
                    return (
                      <li key={r.id}>
                        <button onClick={() => addAndStay(r)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-white/10">
                          <span className="shrink-0 text-sky-200"><Pin size={16} /></span>
                          <span className="min-w-0">
                            <span className="block truncate text-[15px] font-light">{l.title}</span>
                            {l.sub && <span className="block truncate text-xs font-light text-white/55">{l.sub}</span>}
                          </span>
                          <span className="ml-auto shrink-0 text-xs text-white/60">{known.has(r.id) ? '✓' : `+ ${t('addBtn')}`}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {results && results.length === 0 && !busy && <div className="px-1 py-2 text-sm font-light text-white/65">{t('noResults')}</div>}
            </div>
          )}
          {error && <div className="mt-2 px-1 text-sm font-light text-rose-200">{error}</div>}

          <button onClick={() => setManual((v) => !v)} className="mt-3 px-1 text-sm font-light text-white/60 underline">
            {t('addCoords')}
          </button>
          {manual && (
            <div className="mt-3 space-y-2">
              <input className={input} placeholder={t('placeName')} value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} />
              <div className="flex gap-2">
                <input className={input} inputMode="decimal" placeholder={t('latitude')} value={m.lat} onChange={(e) => setM({ ...m, lat: e.target.value })} />
                <input className={input} inputMode="decimal" placeholder={t('longitude')} value={m.lon} onChange={(e) => setM({ ...m, lon: e.target.value })} />
              </div>
              <button onClick={submitManual} disabled={busy} className="glass w-full px-4 py-3 text-[15px] font-normal transition active:scale-[0.98] disabled:opacity-50">
                {t('addBtn')}
              </button>
            </div>
          )}

          {custom.length === 0 ? (
            <p className="mt-16 text-center text-sm font-light text-white/50">{t('noPlacesYet')}</p>
          ) : (
            <ul className="mt-6 space-y-3">
              {custom.map((p) => (
                <PlaceCard key={p.id} place={p} onOpen={(rect) => onOpenPlace(p, rect)} onRemove={() => remove(p.id)} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  )
}
