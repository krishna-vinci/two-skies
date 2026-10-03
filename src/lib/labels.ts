export type AqiKey = 'aqiGood' | 'aqiModerate' | 'aqiSensitive' | 'aqiUnhealthy' | 'aqiVery' | 'aqiHazardous'
export type UvKey = 'uvLow' | 'uvModerate' | 'uvHigh' | 'uvVeryHigh' | 'uvExtreme'

export function aqiCategory(n: number): { label: string; color: string; key: AqiKey } {
  if (n <= 50) return { label: 'Good', color: '#4ade80', key: 'aqiGood' }
  if (n <= 100) return { label: 'Moderate', color: '#facc15', key: 'aqiModerate' }
  if (n <= 150) return { label: 'Unhealthy for sensitive groups', color: '#fb923c', key: 'aqiSensitive' }
  if (n <= 200) return { label: 'Unhealthy', color: '#f87171', key: 'aqiUnhealthy' }
  if (n <= 300) return { label: 'Very unhealthy', color: '#c084fc', key: 'aqiVery' }
  return { label: 'Hazardous', color: '#be123c', key: 'aqiHazardous' }
}

export function uvKey(n: number): UvKey {
  if (n < 3) return 'uvLow'
  if (n < 6) return 'uvModerate'
  if (n < 8) return 'uvHigh'
  if (n < 11) return 'uvVeryHigh'
  return 'uvExtreme'
}

const UV_EN: Record<UvKey, string> = { uvLow: 'Low', uvModerate: 'Moderate', uvHigh: 'High', uvVeryHigh: 'Very high', uvExtreme: 'Extreme' }
export const uvLabel = (n: number): string => UV_EN[uvKey(n)]
