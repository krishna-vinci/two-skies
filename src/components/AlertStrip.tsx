import { alertText, nowcastText } from '../../shared/messages.js'
import { useInsights } from '../lib/useInsights'
import { useI18n } from '../lib/i18n'
import type { Weather } from '../lib/types'
import { AlertIcon, Drop } from './icons'

/** Compact pills for the home panel: rain outlook + most serious alert. */
export function AlertStrip({ w, nowMs }: { w: Weather | undefined; nowMs: number }) {
  const { lang } = useI18n()
  const ins = useInsights(w, nowMs)
  if (!ins) return null
  const top = ins.alerts.find((a) => a.id !== 'umbrella') ?? ins.alerts[0]
  const showRain = ins.nc.kind === 'soon' || ins.nc.kind === 'now' || ins.nc.kind === 'ending'
  if (!top && !showRain) return null
  const pill = 'glass flex max-w-full items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-light'
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {showRain && (
        <div className={pill} style={{ borderRadius: 999 }}>
          <span className="shrink-0 text-sky-200"><Drop size={14} /></span>
          <span className="truncate">{nowcastText(ins.nc, lang)}</span>
        </div>
      )}
      {top && (
        <div className={pill} style={{ borderRadius: 999 }}>
          <span className={`shrink-0 ${top.level >= 2 ? 'text-rose-300' : 'text-amber-200'}`}><AlertIcon size={14} /></span>
          <span className="truncate">{alertText(top, lang).title}</span>
        </div>
      )}
    </div>
  )
}
