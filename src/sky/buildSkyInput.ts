import { moonPhase, sunAltitude, sunProgress } from '../lib/astro'
import type { Place, Weather } from '../lib/types'
import type { SkyInput } from './skyState'

/** Sky input from live weather + astronomy. Works without weather (astronomy-only sky). */
export function buildSkyInput(w: Weather | undefined, place: Place, now: Date): SkyInput {
  const alt = sunAltitude(now, place.lat, place.lon)
  const moon = moonPhase(now)
  if (!w) {
    const localHour = ((now.getUTCHours() + now.getUTCMinutes() / 60 + place.utcOffsetMin / 60) % 24 + 24) % 24
    return {
      code: 0,
      isDay: alt > 0,
      sunAltitude: alt,
      cloudCover: 0,
      windSpeed: 5,
      moonPhase: moon,
      sunProgress: Math.min(1, Math.max(0, (localHour - 6) / 12)),
    }
  }
  const d = w.daily[0]
  return {
    code: w.current.code,
    isDay: w.current.isDay,
    sunAltitude: alt,
    cloudCover: w.current.cloud,
    windSpeed: w.current.windSpeed,
    moonPhase: moon,
    sunProgress: sunProgress(now, d.sunrise, d.sunset),
  }
}
