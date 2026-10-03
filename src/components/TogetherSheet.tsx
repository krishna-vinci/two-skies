import { useMemo } from 'react'
import { Sheet } from './Sheet'
import { localTime, formatDiff } from '../lib/couple'
import { useNow } from '../lib/hooks'
import { AWAKE, awakeWindows, dayBarGradient, nextSunEvents, overlap, togetherState, type Win } from '../lib/together'
import { placeLabels, useI18n } from '../lib/i18n'
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

function Bar({ place, now, start, end, shared }: { place: Place; now: number; start: number; end: number; shared: Win[] }) {
  const { lang } = useI18n()
  const bucket = Math.floor(now / 600_000)
  const gradient = useMemo(() => dayBarGradient(place, start, end), [place, bucket]) // eslint-disable-line react-hooks/exhaustive-deps
  const pct = (t: number) => `${((Math.min(end, Math.max(start, t)) - start) / (end - start)) * 100}%`
  const width = (a: number, b: number) => `${((Math.min(end, b) - Math.max(start, a)) / (end - start)) * 100}%`
  const asleep = gaps(awakeWindows(place, now), start, end)

  const ticks: number[] = []
  const off = place.utcOffsetMin * 60_000
  for (let t = Math.ceil((start + off) / (4 * HOUR)) * 4 * HOUR - off; t < end; t += 4 * HOUR) ticks.push(t)

  const labels = placeLabels(place, lang)
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm font-light">
        <span>{labels.title}</span>
        <span className="tabular-nums text-white/70">{localTime(new Date(now), place)}</span>
      </div>
      <div className="relative mt-1.5 h-10 overflow-hidden rounded-xl" style={{ background: gradient }}>
        {asleep.map((g) => (
          <div key={g.start} className="absolute inset-y-0 bg-black/45" style={{ left: pct(g.start), width: width(g.start, g.end) }} />
        ))}
        {shared.map((g) => (
          <div key={g.start} className="absolute inset-y-0 border-x border-white/70 bg-white/20" style={{ left: pct(g.start), width: width(g.start, g.end) }} />
        ))}
        <div className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" style={{ left: pct(now) }} />
      </div>
      <div className="relative mt-1 h-4 text-[10px] tabular-nums text-white/60">
        {ticks.map((t) => (
          <span key={t} className="absolute -translate-x-1/2" style={{ left: pct(t) }}>
            {hh(new Date(t + off).getUTCHours())}
          </span>
        ))}
      </div>
    </div>
  )
}

export function TogetherSheet({ him, her, onClose }: { him: Place; her: Place; onClose: () => void }) {
  const { t, lang } = useI18n()
  const nowDate = useNow(30_000)
  const now = nowDate.getTime()
  const a = useWeather(him).data
  const b = useWeather(her).data

  const start = now - BEFORE
  const end = start + SPAN
  const shared = useMemo(() => overlap(awakeWindows(him, now), awakeWindows(her, now)), [him, her, now])
  const st = togetherState(now, him, her)
  const hisName = placeLabels(him, lang).title
  const herName = placeLabels(her, lang).title
  const dur = formatDiff(st.minutes, lang)

  const status =
    st.kind === 'both'
      ? t('bothAwake', { dur })
      : `${st.kind === 'him-asleep' ? t('asleepOne', { name: hisName }) : st.kind === 'her-asleep' ? t('asleepOne', { name: herName }) : t('bothAsleep')} · ${t('nextTogether', { dur })}`

  const events = nextSunEvents([{ place: him, weather: a }, { place: her, weather: b }], now)

  return (
    <Sheet title={t('together')} subtitle={t('togetherSub')} onClose={onClose}>
      <div className={`rounded-2xl p-4 text-[15px] font-light ${st.kind === 'both' ? 'bg-emerald-400/20' : 'bg-white/10'}`}>{status}</div>

      <div className="mt-5 space-y-3">
        <Bar place={him} now={now} start={start} end={end} shared={shared} />
        <Bar place={her} now={now} start={start} end={end} shared={shared} />
      </div>
      <p className="mt-2 text-xs font-light text-white/55">
        {t('awakeAssume', { from: `${hh(AWAKE.from)}:00`, to: `${hh(AWAKE.to)}:00` })}
      </p>

      {events.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-sm font-light text-white/85">
          {events.map((e) => (
            <li key={e.place.id + e.type}>
              {t(e.type === 'sunrise' ? 'sunriseIn' : 'sunsetIn', {
                place: placeLabels(e.place, lang).title,
                dur: formatDiff(Math.max(1, Math.round((e.time - now) / 60_000)), lang),
              })}
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}
