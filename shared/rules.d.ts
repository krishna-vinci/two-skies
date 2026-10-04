export const WET_MM: number
export interface Nowcast {
  kind: 'now' | 'ending' | 'soon' | 'dry' | 'unknown'
  minutes: number | null
}
export function nowcast(minutely: { time: number; precip: number }[] | undefined, now: number): Nowcast
export const STORM_CAPE: number
export const STORM_LI: number
export interface Alert {
  id: 'aqi' | 'heat' | 'uv' | 'storm' | 'umbrella' | 'humid'
  level: 1 | 2 | 3
  value: number
}
export function alertsFor(input: {
  current: { feelsLike: number; uv: number; isDay: boolean; code: number; wetBulb?: number }
  daily0?: { apparentMax?: number; uvMax?: number; precipProbMax?: number }
  air?: { usAqi: number | null } | null
  hourly?: { time: number; code: number; cape?: number; liftedIndex?: number; wetBulb?: number }[]
  now: number
}): Alert[]
export function rainChance(rainProb: { time: number; p: number }[] | undefined, now: number): { time: number; p: number } | null
export function kindOfCode(code: number): 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder'
export interface HourlyDigest {
  temp: number
  kind: string
  rain: number
  alerts: string
}
export function hourlyDigest(i: { temp: number; code: number; alerts: Alert[]; rainP?: number }): HourlyDigest
export function hourlyChanged(prev: HourlyDigest | undefined, cur: HourlyDigest): boolean
export function ensembleRainProb(j: unknown, wetMm?: number): { time: number; p: number }[]
