import { useMemo } from 'react'
import { alertsFor, nowcast } from '../../shared/rules.js'
import type { Weather } from './types'

/** Rain nowcast + alerts for one place, from the shared rules. */
export function useInsights(w: Weather | undefined, nowMs: number) {
  return useMemo(() => {
    if (!w) return null
    return {
      nc: nowcast(w.minutely, nowMs),
      alerts: alertsFor({ current: w.current, daily0: w.daily[0], air: w.air, hourly: w.hourly, now: nowMs }),
    }
  }, [w, nowMs])
}
