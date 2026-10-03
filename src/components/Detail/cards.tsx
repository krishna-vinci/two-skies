import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { alertText, nowcastText } from '../../../shared/messages.js'
import { AlertIcon, Drop, WeatherIcon } from '../icons'
import { aqiCategory, uvKey } from '../../lib/labels'
import { DIR_KEYS, localeFor, useI18n } from '../../lib/i18n'
import { useInsights } from '../../lib/useInsights'
import type { Place, Weather } from '../../lib/types'
import { describeWeather } from '../../lib/weatherCodes'

export const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
}

export function Card({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <motion.section variants={item} className={`glass p-5 ${className}`}>
      <h3 className="mb-3 text-[11px] font-normal uppercase tracking-[0.18em] text-white/65">{title}</h3>
      {children}
    </motion.section>
  )
}

const fmt = (tz: string, opts: Intl.DateTimeFormatOptions, t: number, locale = 'en-GB') =>
  new Intl.DateTimeFormat(locale, { timeZone: tz, ...opts }).format(t)

export function HeadsUp({ w, nowMs }: { w: Weather; nowMs: number }) {
  const { t, lang } = useI18n()
  const ins = useInsights(w, nowMs)
  if (!ins) return null
  const rain = ins.nc.kind !== 'unknown' ? nowcastText(ins.nc, lang) : ''
  if (!ins.alerts.length && !rain) return null
  return (
    <Card title={t('headsUp')} className="md:col-span-2">
      <ul className="space-y-3">
        {rain && (
          <li className="flex items-start gap-3">
            <span className="mt-0.5 text-sky-200"><Drop size={18} /></span>
            <div>
              <div className="text-[15px]">{rain}</div>
              <div className="text-xs text-white/55">{t('rainOutlook')}</div>
            </div>
          </li>
        )}
        {ins.alerts.map((a) => {
          const txt = alertText(a, lang)
          return (
            <li key={a.id} className="flex items-start gap-3">
              <span className={`mt-0.5 ${a.level >= 2 ? 'text-rose-300' : 'text-amber-200'}`}><AlertIcon size={18} /></span>
              <div>
                <div className="text-[15px]">{txt.title}</div>
                <div className="text-sm font-light text-white/70">{txt.body}</div>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

export function Hourly({ place, w, now }: { place: Place; w: Weather; now: number }) {
  const { t } = useI18n()
  let start = w.hourly.findIndex((h) => h.time + 3600_000 > now)
  if (start < 0) start = 0
  const hours = w.hourly.slice(start, start + 24)
  return (
    <Card title={t('next24')} className="md:col-span-2">
      <div className="no-scrollbar -mx-2 flex snap-x gap-1 overflow-x-auto px-2 pb-1">
        {hours.map((h, i) => {
          const d = describeWeather(h.code)
          return (
            <div
              key={h.time}
              className={`flex w-[62px] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl py-3 ${i === 0 ? 'bg-white/15' : ''}`}
            >
              <span className="text-xs font-light text-white/75">
                {i === 0 ? t('now') : fmt(place.tz, { hour: '2-digit', hour12: false }, h.time)}
              </span>
              <WeatherIcon kind={d.kind} isDay={h.isDay} size={24} />
              <span className="text-[17px] font-light tabular-nums">{Math.round(h.temp)}°</span>
              <div className="h-1 w-6 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-sky-300" style={{ width: `${h.precipProb}%` }} />
              </div>
              <span className="text-[10px] text-white/55">{h.precipProb}%</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export function Daily({ place, w }: { place: Place; w: Weather }) {
  const { t, lang } = useI18n()
  const min = Math.min(...w.daily.map((d) => d.tMin))
  const max = Math.max(...w.daily.map((d) => d.tMax))
  const span = Math.max(1, max - min)
  return (
    <Card title={t('sevenDay')}>
      <ul className="space-y-1">
        {w.daily.map((d, i) => {
          const desc = describeWeather(d.code)
          const left = ((d.tMin - min) / span) * 100
          const width = ((d.tMax - d.tMin) / span) * 100
          return (
            <li key={d.date} className="flex items-center gap-3 py-1.5 text-[15px] font-light">
              <span className="w-14 text-white/85">
                {i === 0 ? t('today') : fmt(place.tz, { weekday: 'short' }, d.date + 12 * 3600_000, localeFor(lang))}
              </span>
              <WeatherIcon kind={desc.kind} size={22} />
              <span className="w-9 text-right text-xs text-sky-200/80">{d.precipProbMax > 15 ? `${d.precipProbMax}%` : ''}</span>
              <span className="w-7 text-right tabular-nums text-white/65">{Math.round(d.tMin)}°</span>
              <div className="relative h-1.5 flex-1 rounded-full bg-white/15">
                <div
                  className="absolute h-full rounded-full"
                  style={{ left: `${left}%`, width: `${Math.max(width, 6)}%`, background: 'linear-gradient(90deg,#7dd3fc,#fcd34d,#fb923c)' }}
                />
              </div>
              <span className="w-7 tabular-nums">{Math.round(d.tMax)}°</span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

export function SunArc({ place, w, now }: { place: Place; w: Weather; now: number }) {
  const { t } = useI18n()
  const d = w.daily[0]
  const raw = (now - d.sunrise) / (d.sunset - d.sunrise)
  const isDay = raw >= 0 && raw <= 1
  const p = Math.min(1, Math.max(0, raw))
  const ang = Math.PI * (1 - p)
  const x = 150 + 120 * Math.cos(ang)
  const y = 140 - 120 * Math.sin(ang)
  const mins = Math.round((d.sunset - d.sunrise) / 60_000)
  return (
    <Card title={t('sun')}>
      <svg viewBox="0 0 300 168" className="w-full">
        <defs>
          <linearGradient id="arc" x1="0" x2="1">
            <stop offset="0" stopColor="#fdba74" />
            <stop offset="0.5" stopColor="#fde68a" />
            <stop offset="1" stopColor="#fb923c" />
          </linearGradient>
        </defs>
        <path d="M30 140 A120 120 0 0 1 270 140" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" />
        <path d="M30 140 A120 120 0 0 1 270 140" pathLength={1} fill="none" stroke="url(#arc)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${isDay ? p : 0} 1`} />
        <line x1="14" y1="140" x2="286" y2="140" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        {isDay ? (
          <>
            <circle cx={x} cy={y} r="16" fill="#fde68a" opacity="0.25" />
            <circle cx={x} cy={y} r="8" fill="#fff7d6" />
          </>
        ) : (
          <circle cx={raw < 0 ? 30 : 270} cy="140" r="6" fill="#c7d2fe" />
        )}
        <text x="30" y="160" textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.8)">{fmt(place.tz, { hour: '2-digit', minute: '2-digit', hour12: false }, d.sunrise)}</text>
        <text x="270" y="160" textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.8)">{fmt(place.tz, { hour: '2-digit', minute: '2-digit', hour12: false }, d.sunset)}</text>
        <text x="150" y="112" textAnchor="middle" fontSize="22" fontWeight="200" fill="#fff">{Math.floor(mins / 60)}h {mins % 60}m</text>
        <text x="150" y="130" textAnchor="middle" fontSize="10" letterSpacing="2" fill="rgba(255,255,255,0.55)">{t('daylight')}</text>
      </svg>
    </Card>
  )
}

export function WindCompass({ w }: { w: Weather }) {
  const { t } = useI18n()
  const { windDir, windSpeed } = w.current
  const label = t(DIR_KEYS[Math.round(windDir / 45) % 8])
  return (
    <Card title={t('wind')}>
      <div className="flex items-center gap-5">
        <svg viewBox="0 0 160 160" className="w-36 shrink-0">
          <circle cx="80" cy="80" r="66" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
          {Array.from({ length: 36 }, (_, i) => {
            const a = (i * 10 * Math.PI) / 180
            const r1 = i % 9 === 0 ? 58 : 62
            return <line key={i} x1={80 + Math.sin(a) * r1} y1={80 - Math.cos(a) * r1} x2={80 + Math.sin(a) * 66} y2={80 - Math.cos(a) * 66} stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
          })}
          {[['N', 80, 28], ['E', 132, 84], ['S', 80, 140], ['W', 28, 84]].map(([t, tx, ty]) => (
            <text key={t as string} x={tx as number} y={ty as number} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.75)">{t}</text>
          ))}
          <motion.g initial={{ rotate: 0 }} animate={{ rotate: windDir + 180 }} transition={{ type: 'spring', stiffness: 60, damping: 14 }}>
            <line x1="80" y1="40" x2="80" y2="120" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <path d="M80 40 L72 54 M80 40 L88 54" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
          </motion.g>
          <circle cx="80" cy="80" r="3" fill="#fff" />
        </svg>
        <div>
          <div className="text-4xl font-extralight tabular-nums">{Math.round(windSpeed)}</div>
          <div className="text-xs text-white/65">{t('windFrom', { dir: label })}</div>
        </div>
      </div>
    </Card>
  )
}

export function AqiCard({ w }: { w: Weather }) {
  const { t } = useI18n()
  const air = w.air
  if (!air || air.usAqi === null) return null
  const cat = aqiCategory(air.usAqi)
  const pos = Math.min(300, air.usAqi) / 3
  return (
    <Card title={t('air')}>
      <div className="flex items-baseline gap-3">
        <span className="text-5xl font-extralight tabular-nums">{Math.round(air.usAqi)}</span>
        <span className="text-sm font-light" style={{ color: cat.color }}>{t(cat.key)}</span>
      </div>
      <div className="relative mt-4 h-1.5 rounded-full" style={{ background: 'linear-gradient(90deg,#4ade80 0%,#facc15 17%,#fb923c 33%,#f87171 50%,#c084fc 83%,#be123c 100%)' }}>
        <div className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/30" style={{ left: `${pos}%` }} />
      </div>
      <div className="mt-3 flex gap-5 text-xs text-white/70">
        {air.pm25 !== null && <span>PM2.5 <b className="font-normal text-white">{air.pm25.toFixed(0)}</b></span>}
        {air.pm10 !== null && <span>PM10 <b className="font-normal text-white">{air.pm10.toFixed(0)}</b></span>}
      </div>
    </Card>
  )
}

export function Stats({ w }: { w: Weather }) {
  const { t } = useI18n()
  const c = w.current
  const tiles: [string, string, string?][] = [
    [t('feelsLike'), `${Math.round(c.feelsLike)}°`],
    [t('humidity'), `${Math.round(c.humidity)}%`],
    [t('uvIndex'), c.uv.toFixed(0), t(uvKey(c.uv))],
    [t('rainNow'), `${c.precip.toFixed(1)} mm`, t('pctToday', { n: w.daily[0].precipProbMax })],
    [t('cloudCover'), `${Math.round(c.cloud)}%`],
  ]
  return (
    <Card title={t('conditions')} className="md:col-span-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map(([k, v, sub]) => (
          <div key={k} className="rounded-2xl bg-white/8 p-3.5">
            <div className="text-[11px] text-white/60">{k}</div>
            <div className="mt-1 text-2xl font-extralight tabular-nums">{v}</div>
            <div className="h-4 text-[11px] text-white/60">{sub ?? ''}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}
