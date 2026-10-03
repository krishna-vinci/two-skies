export const WET_MM: number
export interface Nowcast {
  kind: 'now' | 'ending' | 'soon' | 'dry' | 'unknown'
  minutes: number | null
}
export function nowcast(minutely: { time: number; precip: number }[] | undefined, now: number): Nowcast
export interface Alert {
  id: 'aqi' | 'heat' | 'uv' | 'storm' | 'umbrella'
  level: 1 | 2 | 3
  value: number
}
export function alertsFor(input: {
  current: { feelsLike: number; uv: number; isDay: boolean; code: number }
  daily0?: { apparentMax?: number; uvMax?: number; precipProbMax?: number }
  air?: { usAqi: number | null } | null
  hourly?: { time: number; code: number }[]
  now: number
}): Alert[]
