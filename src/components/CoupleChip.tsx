import { Bell, Heart } from './icons'
import { formatDiff, tempGap, timeDiffMin } from '../lib/couple'
import { placeLabels, useI18n } from '../lib/i18n'
import type { Place } from '../lib/types'
import { useWeather } from '../lib/useWeather'

interface Props {
  him: Place
  her: Place
  onTogether: () => void
  onNotify: () => void
}

export function CoupleChip({ him, her, onTogether, onNotify }: Props) {
  const { t, lang, setLang } = useI18n()
  const a = useWeather(him).data
  const b = useWeather(her).data
  const diff = timeDiffMin(him, her)
  const gap = a && b ? tempGap(a.current.temp, b.current.temp) : null
  const herName = placeLabels(her, lang).title
  const timeText = diff === 0 ? t('sameTime') : `${herName} ${diff > 0 ? '+' : '−'}${formatDiff(diff, lang)}`
  const gapText = !gap ? '' : gap.delta === 0 ? t('chipSame') : t(gap.delta > 0 ? 'chipWarmer' : 'chipCooler', { n: Math.abs(gap.delta) })
  const round = 'glass flex h-9 w-9 shrink-0 items-center justify-center text-[12px] font-normal transition active:scale-95'

  return (
    <div className="absolute left-1/2 top-1/2 z-20 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 -translate-y-1/2 items-center gap-2">
      <button
        onClick={onTogether}
        aria-label={t('together')}
        className="glass flex min-w-0 items-center gap-2.5 whitespace-nowrap px-4 py-2 text-[12.5px] font-light transition active:scale-[0.98]"
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
      <button onClick={() => setLang(lang === 'en' ? 'th' : 'en')} className={round} style={{ borderRadius: 999 }} aria-label="Language">
        {t('langToggle')}
      </button>
      <button onClick={onNotify} className={round} style={{ borderRadius: 999 }} aria-label={t('notifications')}>
        <Bell size={16} />
      </button>
    </div>
  )
}
