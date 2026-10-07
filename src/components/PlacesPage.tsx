import { motion } from 'motion/react'
import { useRef } from 'react'
import { weatherLabel } from '../../shared/messages.js'
import { CitySearch } from './CitySearch'
import { Chevron, Close, WeatherIcon } from './icons'
import { PullIndicator } from './PullIndicator'
import { localTime } from '../lib/couple'
import { useNow } from '../lib/hooks'
import { useI18n } from '../lib/i18n'
import { usePlaces } from '../lib/placesStore'
import type { Place } from '../lib/types'
import { usePullToRefresh } from '../lib/usePullToRefresh'
import { useWeather } from '../lib/useWeather'
import { describeWeather } from '../lib/weatherCodes'
import { rgba } from '../sky/layers/util'
import { useSky } from '../sky/useSky'

/** One added place: a tile tinted with that place's live sky colours. */
function PlaceCard({ place, onOpen, onRemove }: { place: Place; onOpen: (rect: DOMRect) => void; onRemove: () => void }) {
  const { t, lang, label } = useI18n()
  const w = useWeather(place).data
  const sky = useSky(place, w)
  const now = useNow(30_000)
  const labels = label(place)
  const kind = w ? describeWeather(w.current.code).kind : null
  return (
    <li className="relative">
      <button
        onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
        className="relative block w-full overflow-hidden rounded-[26px] border border-white/15 p-4 pe-12 text-start shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition active:scale-[0.99]"
        style={{ background: `linear-gradient(170deg, ${rgba(sky.top)}, ${rgba(sky.mid)} 55%, ${rgba(sky.bottom)})`, minHeight: 112 }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
        <div className="text-soft-shadow relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-xl font-light leading-tight">{labels.title}</div>
            <div className="truncate text-sm font-light text-white/75">{labels.sub || ' '}</div>
            <div className="mt-2 text-xs tabular-nums text-white/70">
              {localTime(now, place)} {t('localSuffix')}
            </div>
          </div>
          {w && kind ? (
            <div className="shrink-0 text-end">
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
        className="absolute end-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/25 text-white/80 backdrop-blur transition hover:bg-black/45"
      >
        <Close size={14} />
      </button>
    </li>
  )
}

/** Full page for browsing extra cities. Nothing here affects the home screen or alerts. */
export function PlacesPage({ onOpenPlace, onClose }: { onOpenPlace: (place: Place, rect: DOMRect) => void; onClose: () => void }) {
  const { t } = useI18n()
  const { custom, add, remove } = usePlaces()
  const scroller = useRef<HTMLDivElement>(null)
  const ptr = usePullToRefresh(scroller, true)
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

          <div className="mt-5">
            <CitySearch
              prefix="c"
              known={known}
              onPick={async (r) => {
                await add(r)
                scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          </div>

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
