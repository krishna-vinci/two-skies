import { describeWeather } from '../lib/weatherCodes'

export type RGB = [number, number, number]

export interface SkyInput {
  code: number
  isDay: boolean
  sunAltitude: number
  cloudCover: number
  windSpeed: number
  moonPhase: number
  sunProgress: number
}

export interface SkyState {
  top: RGB
  mid: RGB
  bottom: RGB
  cloudDensity: number
  cloudDarkness: number
  cloudDrift: number
  rain: number
  snow: number
  fog: number
  stars: number
  sunGlow: number
  sunX: number
  sunY: number
  moonPhase: number
  moonVisible: number
  lightning: boolean
  luminance: number
}

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const mix = (a: RGB, b: RGB, t: number): RGB => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
]

interface Stop {
  alt: number
  top: RGB
  mid: RGB
  bottom: RGB
}

const STOPS: Stop[] = [
  { alt: -18, top: [6, 9, 28], mid: [10, 16, 44], bottom: [18, 24, 60] },
  { alt: -6, top: [24, 30, 84], mid: [70, 60, 130], bottom: [232, 120, 110] },
  { alt: 0, top: [58, 66, 140], mid: [214, 110, 120], bottom: [255, 168, 90] },
  { alt: 8, top: [96, 130, 208], mid: [244, 170, 140], bottom: [255, 206, 140] },
  { alt: 25, top: [52, 126, 228], mid: [110, 176, 240], bottom: [188, 222, 250] },
  { alt: 50, top: [30, 104, 222], mid: [84, 164, 242], bottom: [170, 214, 250] },
]

function palette(alt: number): { top: RGB; mid: RGB; bottom: RGB } {
  if (alt <= STOPS[0].alt) return STOPS[0]
  const last = STOPS[STOPS.length - 1]
  if (alt >= last.alt) return last
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i]
    const b = STOPS[i + 1]
    if (alt >= a.alt && alt <= b.alt) {
      const t = (alt - a.alt) / (b.alt - a.alt)
      return { top: mix(a.top, b.top, t), mid: mix(a.mid, b.mid, t), bottom: mix(a.bottom, b.bottom, t) }
    }
  }
  return last
}

const CLOUD_BASE = {
  clear: 0,
  partly: 0.45,
  cloudy: 0.95,
  fog: 0.6,
  drizzle: 0.8,
  rain: 0.9,
  snow: 0.9,
  thunder: 1,
} as const

const luma = (c: RGB) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255

export function skyState(i: SkyInput): SkyState {
  const w = describeWeather(i.code)
  const cloudDensity = clamp(Math.max(i.cloudCover / 100, CLOUD_BASE[w.kind]))
  const p = palette(i.sunAltitude)
  const dayness = clamp((i.sunAltitude + 6) / 12)
  const grey: RGB = mix([24, 28, 40], [110, 118, 132], dayness)
  const grim = w.kind === 'clear' || w.kind === 'partly' ? 0 : w.kind === 'thunder' ? 0.8 : 0.65
  const tintAmt = clamp(cloudDensity * grim)
  const dark = w.kind === 'thunder' ? 0.7 : 1
  const fin = (c: RGB): RGB => {
    const m = mix(c, grey, tintAmt)
    return [m[0] * dark, m[1] * dark, m[2] * dark]
  }
  const top = fin(p.top)
  const mid = fin(p.mid)
  const bottom = fin(p.bottom)
  const above = i.sunAltitude > 0
  const sunY = above ? 0.78 - 0.55 * Math.sin(Math.PI * i.sunProgress) : 0.82
  return {
    top,
    mid,
    bottom,
    cloudDensity,
    cloudDarkness: clamp(tintAmt + (w.kind === 'thunder' ? 0.3 : 0)),
    cloudDrift: 6 + i.windSpeed * 0.8,
    rain:
      w.kind === 'rain' || w.kind === 'thunder'
        ? w.intensity
        : w.kind === 'drizzle'
          ? w.intensity * 0.5
          : 0,
    snow: w.kind === 'snow' ? w.intensity : 0,
    fog: w.kind === 'fog' ? w.intensity : 0,
    stars: clamp((-6 - i.sunAltitude) / 12) * (1 - cloudDensity * 0.9),
    sunGlow: i.sunAltitude > -10 ? clamp((i.sunAltitude + 10) / 20) * (1 - cloudDensity * 0.8) : 0,
    sunX: 0.15 + 0.7 * i.sunProgress,
    sunY,
    moonPhase: i.moonPhase,
    moonVisible: clamp((-2 - i.sunAltitude) / 8) * (1 - cloudDensity * 0.8),
    lightning: w.kind === 'thunder',
    luminance: (luma(top) + luma(mid) + luma(bottom)) / 3,
  }
}

export function lerpState(a: SkyState, b: SkyState, t: number): SkyState {
  const n = (x: number, y: number) => lerp(x, y, t)
  return {
    top: mix(a.top, b.top, t),
    mid: mix(a.mid, b.mid, t),
    bottom: mix(a.bottom, b.bottom, t),
    cloudDensity: n(a.cloudDensity, b.cloudDensity),
    cloudDarkness: n(a.cloudDarkness, b.cloudDarkness),
    cloudDrift: n(a.cloudDrift, b.cloudDrift),
    rain: n(a.rain, b.rain),
    snow: n(a.snow, b.snow),
    fog: n(a.fog, b.fog),
    stars: n(a.stars, b.stars),
    sunGlow: n(a.sunGlow, b.sunGlow),
    sunX: n(a.sunX, b.sunX),
    sunY: n(a.sunY, b.sunY),
    moonPhase: b.moonPhase,
    moonVisible: n(a.moonVisible, b.moonVisible),
    lightning: b.lightning,
    luminance: n(a.luminance, b.luminance),
  }
}
