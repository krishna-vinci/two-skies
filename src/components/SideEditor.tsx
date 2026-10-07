import { useState } from 'react'
import { CitySearch } from './CitySearch'
import { Close, Pin } from './icons'
import { useI18n } from '../lib/i18n'
import type { SideConfig, StoredPlace } from '../lib/types'

const MAX = 3

/** Edits one side: an optional name and 1-3 cities (the first is the default). */
export function SideEditor({
  title,
  hint,
  value,
  onChange,
  takenIds,
  autoFocusSearch,
}: {
  title: string
  hint?: string
  value: SideConfig
  onChange: (v: SideConfig) => void
  /** ids already used on the other side */
  takenIds: Set<string>
  autoFocusSearch?: boolean
}) {
  const { t, label } = useI18n()
  const [adding, setAdding] = useState(value.places.length === 0)
  const [note, setNote] = useState('')
  const ids = new Set(value.places.map((p) => p.id))

  const add = (r: StoredPlace) => {
    if (ids.has(r.id) || takenIds.has(r.id)) {
      setNote(t('alreadyAdded'))
      return
    }
    setNote('')
    onChange({ ...value, places: [...value.places, r] })
    setAdding(false)
  }
  const makeFirst = (id: string) => {
    const p = value.places.find((x) => x.id === id)
    if (p) onChange({ ...value, places: [p, ...value.places.filter((x) => x.id !== id)] })
  }
  const remove = (id: string) => onChange({ ...value, places: value.places.filter((x) => x.id !== id) })

  return (
    <section className="glass p-5">
      <h3 className="text-lg font-light tracking-tight">{title}</h3>
      {hint && <p className="mt-0.5 text-sm font-light text-white/60">{hint}</p>}

      <input
        value={value.label ?? ''}
        maxLength={30}
        onChange={(e) => onChange({ ...value, label: e.target.value || undefined })}
        placeholder={t('sideName')}
        aria-label={t('sideName')}
        className="mt-4 w-full rounded-2xl border border-white/20 bg-black/25 px-4 py-3 text-[15px] font-light outline-none placeholder:text-white/40 focus:border-white/50"
      />

      <ul className="mt-3 space-y-1">
        {value.places.map((p, i) => {
          const l = label(p)
          return (
            <li key={p.id} className="flex items-center gap-2 rounded-2xl bg-white/8 px-3 py-2.5">
              <span className="shrink-0 text-white/70"><Pin size={16} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-light">{l.title}</span>
                {l.sub && <span className="block truncate text-xs font-light text-white/55">{l.sub}</span>}
              </span>
              {i === 0 ? (
                <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-light text-white/80">{t('defaultCity')}</span>
              ) : (
                <button onClick={() => makeFirst(p.id)} className="shrink-0 text-xs font-light text-white/65 underline">
                  {t('makeFirst')}
                </button>
              )}
              {value.places.length > 1 && (
                <button onClick={() => remove(p.id)} aria-label={t('removePlace')} className="shrink-0 rounded-full p-1.5 text-white/55 transition hover:text-white">
                  <Close size={16} />
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {value.places.length < MAX ? (
        adding ? (
          <div className="mt-3">
            <CitySearch prefix="p" known={new Set([...ids, ...takenIds])} onPick={add} autoFocus={autoFocusSearch} />
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="mt-3 px-1 text-sm font-light text-white/75 underline">
            + {t('addCity')}
          </button>
        )
      ) : (
        <p className="mt-3 px-1 text-xs font-light text-white/50">{t('maxThree')}</p>
      )}
      {note && <p className="mt-2 px-1 text-sm font-light text-rose-200">{note}</p>}
    </section>
  )
}
