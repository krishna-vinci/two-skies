import { useEffect, useState } from 'react'
import { Sheet } from './Sheet'
import { Close, Pin } from './icons'
import { manualRecord, resolveTz, searchCities } from '../lib/geocode'
import { placeLabels, useI18n } from '../lib/i18n'
import { usePlaces } from '../lib/placesStore'
import { PLACES } from '../lib/places'
import type { Place, StoredPlace } from '../lib/types'

export function PlacesSheet({ current, onPick, onClose }: { current: string; onPick: (id: string) => void; onClose: () => void }) {
  const { t, lang } = useI18n()
  const { custom, add, remove } = usePlaces()
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

  const choose = async (r: StoredPlace) => {
    await add(r)
    onPick(r.id)
  }

  const submitManual = async () => {
    const lat = Number(m.lat)
    const lon = Number(m.lon)
    if (!m.name.trim() || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || m.lat.trim() === '' || m.lon.trim() === '') {
      setError(t('coordsInvalid'))
      return
    }
    setBusy(true)
    setError('')
    try {
      await choose(manualRecord(m.name, lat, lon, await resolveTz(lat, lon)))
    } catch {
      setError(t('searchFailed'))
      setBusy(false)
    }
  }

  const row = (p: Place, removable = false) => {
    const l = placeLabels(p, lang)
    const on = p.id === current
    return (
      <li key={p.id} className="flex items-center gap-1">
        <button onClick={() => onPick(p.id)} className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${on ? 'bg-white/20' : 'hover:bg-white/10'}`}>
          <span className="shrink-0 text-white/70"><Pin size={16} /></span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-light">{l.title}</span>
            {l.sub && <span className="block truncate text-xs font-light text-white/55">{l.sub}</span>}
          </span>
        </button>
        {removable && (
          <button onClick={() => remove(p.id)} aria-label={t('removePlace')} className="shrink-0 rounded-full p-2 text-white/55 transition hover:text-white">
            <Close size={16} />
          </button>
        )}
      </li>
    )
  }

  const input = 'w-full rounded-2xl border border-white/20 bg-black/25 px-4 py-3 text-[15px] font-light outline-none placeholder:text-white/40 focus:border-white/50'
  const head = 'mb-1.5 mt-5 px-1 text-[11px] uppercase tracking-[0.18em] text-white/55'

  return (
    <Sheet title={t('places')} subtitle={t('placesSub')} onClose={onClose}>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchPlace')} className={input} aria-label={t('searchPlace')} />

      {q.trim().length >= 2 && (
        <div className="mt-2">
          {busy && !results && <div className="px-1 py-2 text-sm font-light text-white/60">{t('searching')}</div>}
          {results && results.length > 0 && (
            <ul className="space-y-0.5">
              {results.map((r) => {
                const l = placeLabels({ ...r, owner: null, utcOffsetMin: 0 }, lang)
                return (
                  <li key={r.id}>
                    <button onClick={() => choose(r)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-white/10">
                      <span className="shrink-0 text-sky-200"><Pin size={16} /></span>
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-light">{l.title}</span>
                        {l.sub && <span className="block truncate text-xs font-light text-white/55">{l.sub}</span>}
                      </span>
                      <span className="ml-auto shrink-0 text-xs text-white/60">+ {t('addBtn')}</span>
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

      <h3 className={head}>{t('yourCities')}</h3>
      <ul className="space-y-0.5">{PLACES.map((p) => row(p))}</ul>

      {custom.length > 0 && (
        <>
          <h3 className={head}>{t('addedPlaces')}</h3>
          <ul className="space-y-0.5">{custom.map((p) => row(p, true))}</ul>
        </>
      )}

      <button onClick={() => setManual((v) => !v)} className="mt-5 px-1 text-sm font-light text-white/65 underline">
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
    </Sheet>
  )
}
