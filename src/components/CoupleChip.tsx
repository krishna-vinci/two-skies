import { Heart, Pin, Sliders } from './icons'
import { formatDiff, tempGap, timeDiffMin } from '../lib/couple'
import { useI18n } from '../lib/i18n'
import type { Place } from '../lib/types'
import { useWeather } from '../lib/useWeather'

interface Props {
  a: Place
  b: Place
  onTogether: () => void
  onSettings: () => void
  onPlaces: () => void
  onLanguage: () => void
}

export function CoupleChip({ a, b, onTogether, onSettings, onPlaces, onLanguage }: Props) {
  const { t, lang, label } = useI18n()
  const wa = useWeather(a).data
  const wb = useWeather(b).data
  const diff = timeDiffMin(a, b)
  const gap = wa && wb ? tempGap(wa.current.temp, wb.current.temp) : null
  const bName = label(b).title
  const timeText = diff === 0 ? t('sameTime') : `${bName} ${diff > 0 ? '+' : '−'}${formatDiff(diff, lang)}`
  const gapText = !gap ? '' : gap.delta === 0 ? t('chipSame') : t(gap.delta > 0 ? 'chipWarmer' : 'chipCooler', { n: Math.abs(gap.delta) })
  const round = 'glass glass-strong flex h-8 w-8 shrink-0 items-center justify-center text-[11.5px] font-normal transition active:scale-95'

  return (
    <div className="absolute left-1/2 top-1/2 z-20 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 -translate-y-1/2 items-center gap-1.5">
      <button
        onClick={onTogether}
        aria-label={t('together')}
        className="glass glass-strong flex min-w-0 items-center gap-2.5 whitespace-nowrap px-3 py-2 text-[12.5px] font-light transition active:scale-[0.98]"
        style={{ borderRadius: 999 }}
      >
        <span className="shrink-0 text-rose-200/90"><Heart size={13} /></span>
        <span className="truncate">{timeText}</span>
        {gapText && (
          <>
            <span className="h-3 w-px shrink-0 bg-white/30" />
            <span className="truncate">{gapText}</span>
          </>
        )}
      </button>
      <button onClick={onLanguage} className={round} style={{ borderRadius: 999 }} aria-label={t('language')}>
        {lang.slice(0, 2).toUpperCase()}
      </button>
      <button onClick={onPlaces} className={round} style={{ borderRadius: 999 }} aria-label={t('places')}>
        <Pin size={15} />
      </button>
      <button onClick={onSettings} className={round} style={{ borderRadius: 999 }} aria-label={t('settings')}>
        <Sliders size={15} />
      </button>
    </div>
  )
}
