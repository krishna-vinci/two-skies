const rad = Math.PI / 180
const deg = 180 / Math.PI
const mod = (x: number, m: number) => ((x % m) + m) % m

/** Sun altitude in degrees above the horizon (negative = below). */
export function sunAltitude(date: Date, lat: number, lon: number): number {
  const n = date.getTime() / 86400000 + 2440587.5 - 2451545.0
  const L = mod(280.46 + 0.9856474 * n, 360)
  const g = mod(357.528 + 0.9856003 * n, 360) * rad
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad
  const eps = (23.439 - 0.0000004 * n) * rad
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda))
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda))
  const gmstDeg = mod(18.697374558 + 24.06570982441908 * n, 24) * 15
  const ha = (gmstDeg + lon) * rad - ra
  const alt = Math.asin(
    Math.sin(lat * rad) * Math.sin(dec) + Math.cos(lat * rad) * Math.cos(dec) * Math.cos(ha),
  )
  return alt * deg
}

/** 0 at sunrise, 1 at sunset, clamped. */
export function sunProgress(date: Date, sunrise: number, sunset: number): number {
  const t = (date.getTime() - sunrise) / (sunset - sunrise)
  return Math.min(1, Math.max(0, t))
}

const SYNODIC = 29.530588853
const NEW_MOON_EPOCH = Date.UTC(2000, 0, 6, 18, 14)

/** 0 new → 0.5 full → 1 new. */
export function moonPhase(date: Date): number {
  const days = (date.getTime() - NEW_MOON_EPOCH) / 86400000
  return mod(days / SYNODIC, 1)
}
