import { AnimatePresence, motion } from 'motion/react'
import { weatherLabel } from '../../shared/messages.js'
import { AlertStrip } from './AlertStrip'
import { SkyCanvas } from './SkyCanvas'
import { Swap, WeatherIcon } from './icons'
import { localTime } from '../lib/couple'
import { agoText, useNow, useTween } from '../lib/hooks'
import { useI18n } from '../lib/i18n'
import type { Place } from '../lib/types'
import { useWeather } from '../lib/useWeather'
import { describeWeather } from '../lib/weatherCodes'
import { useSky } from '../sky/useSky'
import type { SkyInput } from '../sky/skyState'

interface Props {
  place: Place
  index: number
  nextName: string
  /** Optional name of this side (shown above the city) */
  sideLabel?: string
  /** Only show the swap button when the side has more than one city */
  canSwitch: boolean
  override?: SkyInput | null
  onOpen: (rect: DOMRect) => void
  onSwitch: () => void
}

export function SkyPanel({ place, index, nextName, sideLabel, canSwitch, override, onOpen, onSwitch }: Props) {
  const { t, lang, label } = useI18n()
  const q = useWeather(place)
  const w = q.data
  const sky = useSky(place, w, override)
  const now = useNow(30_000)
  const temp = useTween(w?.current.temp)
  const kind = w ? describeWeather(w.current.code).kind : null
  const today = w?.daily[0]
  const stale = q.isError || (w && now.getTime() - q.dataUpdatedAt > 25 * 60_000)
  const labels = label(place)
  const ago = agoText(q.dataUpdatedAt, now.getTime(), lang, t('justNow'))

  return (
    <motion.section
      role="button"
      tabIndex={0}
      aria-label={`${labels.title} weather`}
      onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(e.currentTarget.getBoundingClientRect())
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: index * 0.12 }}
      className="relative min-h-0 flex-1 cursor-pointer select-none overflow-hidden outline-none"
    >
      <SkyCanvas state={sky} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />

      <div className="relative z-10 flex h-full flex-col justify-between p-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-6 md:p-9">
        <div>
          <div className="flex items-start justify-between gap-4">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={place.id + lang}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="text-soft-shadow min-w-0"
              >
                {sideLabel && <div className="mb-1 truncate text-[11px] uppercase tracking-[0.2em] text-white/70">{sideLabel}</div>}
                <h2 className="truncate text-[28px] font-light leading-tight tracking-tight md:text-4xl">{labels.title}</h2>
                <p className="mt-1 text-[15px] font-light leading-tight text-white/80">{labels.sub || ' '}</p>
              </motion.div>
            </AnimatePresence>
            <div className="text-soft-shadow shrink-0 text-end">
              <div className="text-[28px] font-extralight tabular-nums leading-none md:text-4xl">{localTime(now, place)}</div>
              <div className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-white/70">{t('localTime')}</div>
            </div>
          </div>
          <AlertStrip w={w} nowMs={now.getTime()} offMin={place.utcOffsetMin} />
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="text-soft-shadow min-w-0">
            {w && kind ? (
              <>
                <div
                  className="font-extralight leading-[0.9] tracking-[-0.05em] tabular-nums"
                  style={{ fontSize: 'clamp(64px, min(24vw, 14dvh), 168px)' }}
                >
                  {Math.round(temp)}
                  <span className="align-top text-[0.4em] font-light tracking-normal opacity-80">°</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[17px] font-light">
                  <WeatherIcon kind={kind} isDay={w.current.isDay} size={22} />
                  {weatherLabel(w.current.code, lang)}
                </div>
                <div className="mt-1 text-sm font-light text-white/75">
                  {t('feels')} {Math.round(w.current.feelsLike)}° · {t('high')} {Math.round(today!.tMax)}° {t('low')} {Math.round(today!.tMin)}°
                </div>
                {stale && <div className="mt-1 text-xs text-white/60">{t('updated', { when: ago })}</div>}
              </>
            ) : q.isError ? (
              <div className="text-sm text-white/80">
                {t('unreachable')}
                <button
                  className="ms-2 underline"
                  onClick={(e) => {
                    e.stopPropagation()
                    q.refetch()
                  }}
                >
                  {t('retry')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="h-[76px] w-40 animate-pulse rounded-2xl bg-white/15" />
                <div className="h-4 w-28 animate-pulse rounded-full bg-white/15" />
              </div>
            )}
          </div>

          {canSwitch && <button
            aria-label={t('switchPlace')}
            onClick={(e) => {
              e.stopPropagation()
              onSwitch()
            }}
            className="glass flex shrink-0 items-center gap-2 px-3.5 py-2 text-xs font-light text-white/90 transition active:scale-95"
            style={{ borderRadius: 999 }}
          >
            <Swap size={14} />
            {nextName}
          </button>}
        </div>
      </div>
    </motion.section>
  )
}
