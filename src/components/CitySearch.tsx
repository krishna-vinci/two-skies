import { useEffect, useState } from 'react'
import { Pin } from './icons'
import { manualRecord, resolveTz, searchCities, withEnglishName, type IdPrefix } from '../lib/geocode'
import { seedName } from '../lib/placeNames'
import { useI18n } from '../lib/i18n'
import type { StoredPlace } from '../lib/types'

const field = 'w-full rounded-2xl border border-white/20 bg-black/25 px-4 py-3 text-[15px] font-light outline-none placeholder:text-white/40 focus:border-white/50'

/**
 * Type-ahead city search with an "add by coordinates" fallback.
 * `onPick` receives a record that already carries English and Thai names.
 */
export function CitySearch({
  onPick,
  prefix,
  known,
  autoFocus,
}: {
  onPick: (r: StoredPlace) => Promise<void> | void
  prefix: IdPrefix
  known?: Set<string>
  autoFocus?: boolean
}) {
  const { t, lang, label } = useI18n()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<StoredPlace[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [manual, setManual] = useState(false)
  const [m, setM] = useState({ name: '', lat: '', lon: '' })

  // debounced search; stale requests are aborted
  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setResults(null)
      setBusy(false)
      return
    }
    setBusy(true)
    const ctl = new AbortController()
    const id = setTimeout(() => {
      searchCities(term, lang, ctl.signal, prefix)
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
  }, [q, lang, prefix, t])

  const reset = () => {
    setQ('')
    setResults(null)
    setManual(false)
    setM({ name: '', lat: '', lon: '' })
    setError('')
  }

  const pick = async (r: StoredPlace) => {
    setBusy(true)
    try {
      if (lang !== 'en') seedName(r.id, lang, { name: r.name, subtitle: r.subtitle })
      await onPick(await withEnglishName(r))
      reset()
    } finally {
      setBusy(false)
    }
  }

  const submitManual = async () => {
    const lat = Number(m.lat)
    const lon = Number(m.lon)
    const ok = m.name.trim() && m.lat.trim() !== '' && m.lon.trim() !== '' && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
    if (!ok) return setError(t('coordsInvalid'))
    setBusy(true)
    setError('')
    try {
      await onPick(manualRecord(m.name, lat, lon, await resolveTz(lat, lon), prefix))
      reset()
    } catch {
      setError(t('searchFailed'))
    }
    setBusy(false)
  }

  return (
    <div>
      <input autoFocus={autoFocus} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchPlace')} aria-label={t('searchPlace')} className={field} />

      {q.trim().length >= 2 && (
        <div className="mt-2">
          {busy && !results && <div className="px-1 py-2 text-sm font-light text-white/60">{t('searching')}</div>}
          {results && results.length > 0 && (
            <ul className="space-y-0.5">
              {results.map((r) => {
                const l = label(r)
                return (
                  <li key={r.id}>
                    <button onClick={() => pick(r)} disabled={busy} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start transition hover:bg-white/10 disabled:opacity-60">
                      <span className="shrink-0 text-sky-200"><Pin size={16} /></span>
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-light">{l.title}</span>
                        {l.sub && <span className="block truncate text-xs font-light text-white/55">{l.sub}</span>}
                      </span>
                      <span className="ms-auto shrink-0 text-xs text-white/60">{known?.has(r.id) ? '✓' : `+ ${t('addBtn')}`}</span>
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
          <input className={field} placeholder={t('placeName')} value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} />
          <div className="flex gap-2">
            <input className={field} inputMode="decimal" placeholder={t('latitude')} value={m.lat} onChange={(e) => setM({ ...m, lat: e.target.value })} />
            <input className={field} inputMode="decimal" placeholder={t('longitude')} value={m.lon} onChange={(e) => setM({ ...m, lon: e.target.value })} />
          </div>
          <button onClick={submitManual} disabled={busy} className="glass w-full px-4 py-3 text-[15px] font-normal transition active:scale-[0.98] disabled:opacity-50">
            {t('addBtn')}
          </button>
        </div>
      )}
    </div>
  )
}
