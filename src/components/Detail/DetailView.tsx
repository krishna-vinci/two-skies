import { motion, useReducedMotion } from 'motion/react'
import { SkyCanvas } from '../SkyCanvas'
import { Chevron, WeatherIcon } from '../icons'
import { AqiCard, Daily, Hourly, SunArc, Stats, WindCompass } from './cards'
import { localTime } from '../../lib/couple'
import { ago, useNow } from '../../lib/hooks'
import type { Place } from '../../lib/types'
import { useWeather } from '../../lib/useWeather'
import { describeWeather } from '../../lib/weatherCodes'
import { useSky } from '../../sky/useSky'
import type { SkyInput } from '../../sky/skyState'

export interface Rect {
  top: number
  left: number
  right: number
  bottom: number
}

const inset = (r: Rect) => `inset(${r.top}px ${r.right}px ${r.bottom}px ${r.left}px round 28px)`

export function DetailView({ place, from, override, onClose }: { place: Place; from: Rect; override?: SkyInput | null; onClose: () => void }) {
  const q = useWeather(place)
  const w = q.data
  const sky = useSky(place, w, override)
  const now = useNow(30_000)
  const reduce = useReducedMotion()
  const desc = w ? describeWeather(w.current.code) : null

  const clip = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { clipPath: inset(from) },
        animate: { clipPath: 'inset(0px 0px 0px 0px round 0px)' },
        exit: { clipPath: inset(from) },
      }

  return (
    <motion.div
      {...clip}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-40 overflow-hidden bg-[#0b1020]"
    >
      <SkyCanvas state={sky} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/35" />
      <div className="relative z-10 h-full overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-4xl px-4 pb-16 pt-[max(1rem,env(safe-area-inset-top))] md:px-8">
          <div className="flex items-center justify-between">
            <button onClick={onClose} aria-label="Back" className="glass flex h-11 w-11 items-center justify-center" style={{ borderRadius: 999 }}>
              <Chevron />
            </button>
            <div className="text-soft-shadow text-right text-sm font-light tabular-nums">
              {localTime(now, place)} local
              {q.dataUpdatedAt ? <div className="text-xs text-white/60">updated {ago(q.dataUpdatedAt, now.getTime())}</div> : null}
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6 }} className="text-soft-shadow pb-8 pt-8 text-center">
            <h1 className="text-3xl font-light tracking-tight">{place.name}</h1>
            <p className="mt-1 text-base font-light text-white/80">{place.nameLocal ?? place.subtitle ?? ''}</p>
            {w && desc && (
              <>
                <div className="mt-3 text-[clamp(96px,26vw,168px)] font-extralight leading-[0.95] tracking-[-0.05em]">
                  {Math.round(w.current.temp)}°
                </div>
                <div className="mt-2 flex items-center justify-center gap-2 text-lg font-light">
                  <WeatherIcon kind={desc.kind} isDay={w.current.isDay} size={24} />
                  {desc.label}
                </div>
                <div className="mt-1 text-sm font-light text-white/75">
                  H {Math.round(w.daily[0].tMax)}° · L {Math.round(w.daily[0].tMin)}°
                </div>
              </>
            )}
          </motion.div>

          {w ? (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.35 } } }}
              className="grid grid-cols-1 items-start gap-3 md:grid-cols-2"
            >
              <Hourly place={place} w={w} now={now.getTime()} />
              <Daily place={place} w={w} />
              <SunArc place={place} w={w} now={now.getTime()} />
              <WindCompass w={w} />
              <AqiCard w={w} />
              <Stats w={w} />
            </motion.div>
          ) : (
            <div className="text-center text-sm text-white/70">{q.isError ? 'Weather unavailable right now.' : 'Loading…'}</div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
