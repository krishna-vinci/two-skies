import { AnimatePresence, motion } from 'motion/react'
import { SkyCanvas } from './SkyCanvas'
import { Swap, WeatherIcon } from './icons'
import { localTime } from '../lib/couple'
import { ago, useNow, useTween } from '../lib/hooks'
import type { Place } from '../lib/types'
import { useWeather } from '../lib/useWeather'
import { describeWeather } from '../lib/weatherCodes'
import { useSky } from '../sky/useSky'
import type { SkyInput } from '../sky/skyState'

interface Props {
  place: Place
  index: number
  nextName: string
  override?: SkyInput | null
  onOpen: (rect: DOMRect) => void
  onSwitch: () => void
}

export function SkyPanel({ place, index, nextName, override, onOpen, onSwitch }: Props) {
  const q = useWeather(place)
  const w = q.data
  const sky = useSky(place, w, override)
  const now = useNow(30_000)
  const temp = useTween(w?.current.temp)
  const desc = w ? describeWeather(w.current.code) : null
  const today = w?.daily[0]
  const stale = q.isError || (w && now.getTime() - q.dataUpdatedAt > 25 * 60_000)

  return (
    <motion.section
      role="button"
      tabIndex={0}
      aria-label={`${place.name} weather`}
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
        <div className="flex items-start justify-between gap-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={place.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-soft-shadow"
            >
              <h2 className="text-[28px] font-light leading-none tracking-tight md:text-4xl">{place.name}</h2>
              <p className="mt-1.5 text-[15px] font-light text-white/80">
                {place.nameLocal ?? place.subtitle ?? ' '}
              </p>
            </motion.div>
          </AnimatePresence>
          <div className="text-soft-shadow text-right">
            <div className="text-[28px] font-extralight tabular-nums leading-none md:text-4xl">{localTime(now, place)}</div>
            <div className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-white/70">local time</div>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="text-soft-shadow min-w-0">
            {w ? (
              <>
                <div
                  className="font-extralight leading-[0.9] tracking-[-0.05em] tabular-nums"
                  style={{ fontSize: 'clamp(64px, min(24vw, 14dvh), 168px)' }}
                >
                  {Math.round(temp)}
                  <span className="align-top text-[0.4em] font-light tracking-normal opacity-80">°</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[17px] font-light">
                  <WeatherIcon kind={desc!.kind} isDay={w.current.isDay} size={22} />
                  {desc!.label}
                </div>
                <div className="mt-1 text-sm font-light text-white/75">
                  Feels {Math.round(w.current.feelsLike)}° · H {Math.round(today!.tMax)}° L {Math.round(today!.tMin)}°
                </div>
                {stale && <div className="mt-1 text-xs text-white/60">updated {ago(q.dataUpdatedAt, now.getTime())}</div>}
              </>
            ) : q.isError ? (
              <div className="text-sm text-white/80">
                Can't reach the weather service.
                <button
                  className="ml-2 underline"
                  onClick={(e) => {
                    e.stopPropagation()
                    q.refetch()
                  }}
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="h-[76px] w-40 animate-pulse rounded-2xl bg-white/15" />
                <div className="h-4 w-28 animate-pulse rounded-full bg-white/15" />
              </div>
            )}
          </div>

          <button
            aria-label="Switch place"
            onClick={(e) => {
              e.stopPropagation()
              onSwitch()
            }}
            className="glass flex shrink-0 items-center gap-2 px-3.5 py-2 text-xs font-light text-white/90 transition active:scale-95"
            style={{ borderRadius: 999 }}
          >
            <Swap size={14} />
            {nextName}
          </button>
        </div>
      </div>
    </motion.section>
  )
}
