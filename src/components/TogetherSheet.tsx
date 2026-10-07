import { useMemo } from 'react'
import { Sheet } from './Sheet'
import { localTime, formatDiff } from '../lib/couple'
import { useNow } from '../lib/hooks'
import { awakeWindows, dayBarGradient, nextSunEvents, overlap, togetherState, type Awake, type Win } from '../lib/together'
import { useI18n } from '../lib/i18n'
import type { Place } from '../lib/types'
import { useWeather } from '../lib/useWeather'

const HOUR = 3_600_000
const BEFORE = 4 * HOUR
const SPAN = 24 * HOUR

const hh = (n: number) => String(n).padStart(2, '0')

/** Time ranges inside [a,b] not covered by `awake`. */
function gaps(awake: Win[], a: number, b: number): Win[] {
  const out: Win[] = []
  let cur = a
  for (const w of [...awake].sort((x, y) => x.start - y.start)) {
    if (w.end <= cur || w.start >= b) continue
    if (w.start > cur) out.push({ start: cur, end: w.start })
    cur = Math.max(cur, w.end)
  }
  if (cur < b) out.push({ start: cur, end: b })
  return out
}

function Bar({ place, now, start, end, shared, awake }: { place: Place; now: number; start: number; end: number; shared: Win[]; awake: Awake }) {
  const { label } = useI18n()
  const bucket = Math.floor(now / 600_000)
  const gradient = useMemo(() => dayBarGradient(place, start, end), [place, bucket]) // eslint-disable-line react-hooks/exhaustive-deps
  const pct = (t: number) => `${((Math.min(end, Math.max(start, t)) - start) / (end - start)) * 100}%`
  const width = (a: number, b: number) => `${((Math.min(end, b) - Math.max(start, a)) / (end - start)) * 100}%`
  const asleep = gaps(awakeWindows(place, now, awake), start, end)

  const ticks: number[] = []
  const off = place.utcOffsetMin * 60_000
  for (let t = Math.ceil((start + off) / (4 * HOUR)) * 4 * HOUR - off; t < end; t += 4 * HOUR) ticks.push(t)

  const labels = label(place)
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm font-light">
        <span>{labels.title}</span>
        <span className="tabular-nums text-white/70">{localTime(new Date(now), place)}</span>
      </div>
      <div dir="ltr" className="relative mt-1.5 h-10 overflow-hidden rounded-xl" style={{ background: gradient }}>
        {asleep.map((g) => (
          <div key={g.start} className="absolute inset-y-0 bg-black/45" style={{ left: pct(g.start), width: width(g.start, g.end) }} />
        ))}
        {shared.map((g) => (
          <div key={g.start} className="absolute inset-y-0 border-x border-white/70 bg-white/20" style={{ left: pct(g.start), width: width(g.start, g.end) }} />
        ))}
        <div className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" style={{ left: pct(now) }} />
      </div>
      <div dir="ltr" className="relative mt-1 h-4 text-[10px] tabular-nums text-white/60">
        {ticks.map((t) => (
          <span key={t} className="absolute -translate-x-1/2" style={{ left: pct(t) }}>
            {hh(new Date(t + off).getUTCHours())}
          </span>
        ))}
      </div>
    </div>
  )
}

export function TogetherSheet({ a, b, awake, onClose }: { a: Place; b: Place; awake: Awake; onClose: () => void }) {
  const { t, lang, label } = useI18n()
  const nowDate = useNow(30_000)
  const now = nowDate.getTime()
  const wa = useWeather(a).data
  const wb = useWeather(b).data

  const start = now - BEFORE
  const end = start + SPAN
  const shared = useMemo(() => overlap(awakeWindows(a, now, awake), awakeWindows(b, now, awake)), [a, b, now, awake])
  const st = togetherState(now, a, b, awake)
  const aName = label(a).title
  const bName = label(b).title
  const dur = formatDiff(st.minutes, lang)

  const status =
    st.kind === 'both'
      ? t('bothAwake', { dur })
      : `${st.kind === 'a-asleep' ? t('asleepOne', { name: aName }) : st.kind === 'b-asleep' ? t('asleepOne', { name: bName }) : t('bothAsleep')} · ${t('nextTogether', { dur })}`

  const events = nextSunEvents([{ place: a, weather: wa }, { place: b, weather: wb }], now)

  return (
    <Sheet title={t('together')} subtitle={t('togetherSub')} onClose={onClose}>
      <div className={`rounded-2xl p-4 text-[15px] font-light ${st.kind === 'both' ? 'bg-emerald-400/20' : 'bg-white/10'}`}>{status}</div>

      <div className="mt-5 space-y-3">
        <Bar place={a} now={now} start={start} end={end} shared={shared} awake={awake} />
        <Bar place={b} now={now} start={start} end={end} shared={shared} awake={awake} />
      </div>
      <p className="mt-2 text-xs font-light text-white/55">
        {t('awakeAssume', { from: `${hh(awake.from)}:00`, to: `${hh(awake.to)}:00` })}
      </p>

      {events.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-sm font-light text-white/85">
          {events.map((e) => (
            <li key={e.place.id + e.type}>
              {t(e.type === 'sunrise' ? 'sunriseIn' : 'sunsetIn', {
                place: label(e.place).title,
                dur: formatDiff(Math.max(1, Math.round((e.time - now) / 60_000)), lang),
              })}
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}
