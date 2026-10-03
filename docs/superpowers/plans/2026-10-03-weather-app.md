# Two-Sky Weather App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. No git commits unless the user asks (directory is not a git repo).

**Goal:** Installable PWA showing two live, animated skies (India + Thailand) side by side, with a detailed view per place.

**Architecture:** React UI (Tailwind, Motion) reads weather via TanStack Query from Open-Meteo. Pure TS modules (astronomy, weather codes, `skyState`) compute everything the visuals need; a standalone canvas engine renders the sky from that state in its own rAF loop, mounted by a thin React component.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS v4, Motion, TanStack Query (+ persist), Vitest, vite-plugin-pwa.

**Spec:** `docs/superpowers/specs/2026-10-03-weather-design.md`

## Global Constraints

- Units fixed: °C, km/h. No settings screen, no geocoding search.
- Places hardcoded (coordinates exact): Kothagudem · Sujatha Nagar 17.55, 80.62 (Asia/Kolkata); Hyderabad 17.385, 78.487 (Asia/Kolkata); Khon Kaen / ขอนแก่น 16.44, 102.84 (Asia/Bangkok); Bangkok / กรุงเทพฯ 13.75, 100.50 (Asia/Bangkok).
- Time difference chip: Thailand is 1h 30m ahead of India.
- Query: `staleTime` 10 min, `refetchInterval` 10 min, refetch on focus, cache persisted to localStorage.
- Open-Meteo requests use `timezone=auto`; no API key; no backend.
- Canvas: devicePixelRatio capped at 2, pause when tab hidden, `prefers-reduced-motion` → static gradient + gentle cloud drift only.
- Sky state changes cross-fade ~1.2 s, never hard cut.
- Out of scope: accounts, notifications, maps/radar, settings, unit toggles, geocoding.

## File Structure

```
package.json, vite.config.ts, index.html, tsconfig*.json
public/icon.svg                      PWA icon source
src/main.tsx                         bootstrap: QueryClient + persister
src/App.tsx                          view state (home | detail), layout
src/index.css                        tailwind import, theme tokens, glass utility
src/lib/types.ts                     Place, Weather, SkyState types
src/lib/places.ts                    the four places + defaults
src/lib/couple.ts                    timeDiff, formatDiff, tempGap, localTime
src/lib/astro.ts                     sunAltitude, moonPhase
src/lib/weatherCodes.ts              describeWeather(code)
src/lib/openMeteo.ts                 fetchWeather(place), normalize()
src/lib/useWeather.ts                TanStack hook
src/sky/skyState.ts                  pure: input -> SkyState
src/sky/engine.ts                    canvas renderer class SkyEngine
src/sky/layers/*.ts                  stars, clouds, sun, rain, snow, fog, lightning
src/components/SkyCanvas.tsx         mounts SkyEngine
src/components/SkyPanel.tsx          one half of home screen
src/components/CoupleChip.tsx        time-diff + temp-gap chip
src/components/Detail/*.tsx          Hourly, Daily, SunArc, WindCompass, AqiCard, Stat
src/components/DebugPanel.tsx        ?debug=1 override panel
tests/*.test.ts                      vitest, mirrors src/lib and src/sky
```

---

### Task 1: Scaffold and toolchain

**Files:**
- Create: whole project skeleton (see File Structure)
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Produces: `npm run dev|build|test` working; Tailwind active; path alias none (use relative imports).

- [ ] **Step 1: Scaffold in temp dir and move in**

```bash
cd /home/krishna/weather
npm create vite@latest scaffold-tmp -- --template react-ts
cp -r scaffold-tmp/. . && rm -rf scaffold-tmp
npm install
npm install motion @tanstack/react-query @tanstack/react-query-persist-client @tanstack/query-sync-storage-persister
npm install -D tailwindcss @tailwindcss/vite vitest vite-plugin-pwa
```

- [ ] **Step 2: Configure vite (tailwind, pwa, vitest)** — replace `vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Two Skies',
        short_name: 'Two Skies',
        theme_color: '#0b1020',
        background_color: '#0b1020',
        display: 'standalone',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
    }),
  ],
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
})
```

- [ ] **Step 3: Tailwind entry** — replace `src/index.css` with:

```css
@import "tailwindcss";

:root { color-scheme: dark; }
html, body, #root { height: 100%; margin: 0; background: #0b1020; }
body { font-family: "Inter", system-ui, sans-serif; color: #fff; overflow: hidden; }
.glass {
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.18);
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
  border-radius: 28px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.25);
}
```

Add Inter + Noto Sans Thai to `index.html` `<head>` via Google Fonts (weights 200,300,400,600 for Inter; 300,400,600 for Noto Sans Thai) and set `font-family: "Inter","Noto Sans Thai",system-ui` in the body rule above.

- [ ] **Step 4: Add scripts and smoke test** — in `package.json` add `"test": "vitest run"`. Create `tests/smoke.test.ts`:

```ts
import { expect, test } from 'vitest'
test('toolchain runs', () => { expect(1 + 1).toBe(2) })
```

- [ ] **Step 5: Verify**

Run: `npm test && npm run build`
Expected: 1 test passes; build succeeds.

- [ ] **Step 6: Create `public/icon.svg`** — a 512×512 rounded gradient square (indigo → orange horizon) split by a thin horizon line with a small sun circle top and moon circle bottom. Plain SVG, no external refs.

---

### Task 2: Types, places, couple helpers

**Files:**
- Create: `src/lib/types.ts`, `src/lib/places.ts`, `src/lib/couple.ts`
- Test: `tests/couple.test.ts`

**Interfaces:**
- Produces:
  - `type Owner = 'him' | 'her'`
  - `interface Place { id: string; name: string; nameLocal?: string; subtitle?: string; lat: number; lon: number; tz: string; utcOffsetMin: number; owner: Owner }`
  - `PLACES: Place[]`, `DEFAULT_PLACE: Record<Owner, string>`, `placeById(id: string): Place`, `placesFor(owner: Owner): Place[]`
  - `timeDiffMin(a: Place, b: Place): number` (b minus a), `formatDiff(min: number): string`, `tempGap(a: number, b: number): { delta: number; text: string }`, `localTime(now: Date, place: Place): string` ("14:05")

- [ ] **Step 1: Failing test** — `tests/couple.test.ts`:

```ts
import { expect, test } from 'vitest'
import { PLACES, placeById, placesFor } from '../src/lib/places'
import { timeDiffMin, formatDiff, tempGap, localTime } from '../src/lib/couple'

test('thailand is 90 min ahead of kothagudem', () => {
  expect(timeDiffMin(placeById('kothagudem'), placeById('khonkaen'))).toBe(90)
})
test('formatDiff', () => {
  expect(formatDiff(90)).toBe('1h 30m')
  expect(formatDiff(60)).toBe('1h')
  expect(formatDiff(0)).toBe('0m')
})
test('tempGap wording uses rounded delta', () => {
  expect(tempGap(31.2, 34.9)).toEqual({ delta: 4, text: '4° warmer there' })
  expect(tempGap(34, 31).text).toBe('3° cooler there')
  expect(tempGap(30, 30.2).text).toBe('Same temperature')
})
test('localTime formats HH:mm in place tz', () => {
  const d = new Date('2026-10-03T06:30:00Z')
  expect(localTime(d, placeById('kothagudem'))).toBe('12:00')
  expect(localTime(d, placeById('khonkaen'))).toBe('13:30')
})
test('four places, two per owner', () => {
  expect(PLACES).toHaveLength(4)
  expect(placesFor('him').map(p => p.id)).toEqual(['kothagudem', 'hyderabad'])
  expect(placesFor('her').map(p => p.id)).toEqual(['khonkaen', 'bangkok'])
})
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/couple.test.ts` → module not found.

- [ ] **Step 3: Implement**

`src/lib/types.ts` (Place, Owner as above, plus Weather):

```ts
export type Owner = 'him' | 'her'
export interface Place {
  id: string; name: string; nameLocal?: string; subtitle?: string
  lat: number; lon: number; tz: string; utcOffsetMin: number; owner: Owner
}
export interface Weather {
  fetchedAt: number
  utcOffsetSeconds: number
  current: {
    time: number; temp: number; feelsLike: number; humidity: number; isDay: boolean
    precip: number; code: number; cloud: number; windSpeed: number; windDir: number; uv: number
  }
  hourly: { time: number; temp: number; precipProb: number; code: number; isDay: boolean }[]
  daily: {
    date: number; code: number; tMax: number; tMin: number
    sunrise: number; sunset: number; precipProbMax: number; uvMax: number
  }[]
  air: { usAqi: number | null; pm25: number | null; pm10: number | null } | null
}
```

`src/lib/places.ts`:

```ts
import type { Owner, Place } from './types'

export const PLACES: Place[] = [
  { id: 'kothagudem', name: 'Kothagudem', subtitle: 'Sujatha Nagar', lat: 17.55, lon: 80.62, tz: 'Asia/Kolkata', utcOffsetMin: 330, owner: 'him' },
  { id: 'hyderabad', name: 'Hyderabad', lat: 17.385, lon: 78.487, tz: 'Asia/Kolkata', utcOffsetMin: 330, owner: 'him' },
  { id: 'khonkaen', name: 'Khon Kaen', nameLocal: 'ขอนแก่น', lat: 16.44, lon: 102.84, tz: 'Asia/Bangkok', utcOffsetMin: 420, owner: 'her' },
  { id: 'bangkok', name: 'Bangkok', nameLocal: 'กรุงเทพฯ', lat: 13.75, lon: 100.5, tz: 'Asia/Bangkok', utcOffsetMin: 420, owner: 'her' },
]
export const DEFAULT_PLACE: Record<Owner, string> = { him: 'kothagudem', her: 'khonkaen' }
export const placeById = (id: string): Place => {
  const p = PLACES.find(x => x.id === id)
  if (!p) throw new Error(`unknown place ${id}`)
  return p
}
export const placesFor = (owner: Owner) => PLACES.filter(p => p.owner === owner)
```

`src/lib/couple.ts`:

```ts
import type { Place } from './types'

export const timeDiffMin = (a: Place, b: Place) => b.utcOffsetMin - a.utcOffsetMin

export function formatDiff(min: number): string {
  const m = Math.abs(min)
  const h = Math.floor(m / 60), r = m % 60
  if (h && r) return `${h}h ${r}m`
  if (h) return `${h}h`
  return `${r}m`
}

export function tempGap(mine: number, theirs: number) {
  const delta = Math.round(theirs - mine)
  if (delta === 0) return { delta, text: 'Same temperature' }
  return { delta, text: `${Math.abs(delta)}° ${delta > 0 ? 'warmer' : 'cooler'} there` }
}

export function localTime(now: Date, place: Place): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: place.tz,
  }).format(now)
}
```

- [ ] **Step 4: Run, expect PASS** — `npx vitest run tests/couple.test.ts`

---

### Task 3: Astronomy (sun altitude, moon phase)

**Files:**
- Create: `src/lib/astro.ts`
- Test: `tests/astro.test.ts`

**Interfaces:**
- Produces: `sunAltitude(date: Date, lat: number, lon: number): number` (degrees, + above horizon); `sunAzimuthFraction(date, lat, lon): number` not needed — instead `sunProgress(date: Date, sunrise: number, sunset: number): number` (0 at sunrise, 1 at sunset, clamped, used by arc and sun position); `moonPhase(date: Date): number` (0 new → 0.5 full → 1).

- [ ] **Step 1: Failing test**

```ts
import { expect, test } from 'vitest'
import { sunAltitude, sunProgress, moonPhase } from '../src/lib/astro'

test('sun high at local noon in Kothagudem (early Oct)', () => {
  expect(sunAltitude(new Date('2026-10-03T06:30:00Z'), 17.55, 80.62)).toBeGreaterThan(60)
})
test('sun far below horizon at local midnight', () => {
  expect(sunAltitude(new Date('2026-10-02T18:30:00Z'), 17.55, 80.62)).toBeLessThan(-40)
})
test('sunProgress clamps and interpolates', () => {
  expect(sunProgress(new Date(50), 100, 200)).toBe(0)
  expect(sunProgress(new Date(150), 100, 200)).toBe(0.5)
  expect(sunProgress(new Date(999), 100, 200)).toBe(1)
})
test('moonPhase known new moon and half cycle later', () => {
  const nm = new Date('2000-01-06T18:14:00Z')
  expect(moonPhase(nm)).toBeCloseTo(0, 1)
  const full = new Date(nm.getTime() + 14.765 * 86400000)
  expect(moonPhase(full)).toBeCloseTo(0.5, 1)
})
```

- [ ] **Step 2: Run, expect FAIL** (module missing).

- [ ] **Step 3: Implement** `src/lib/astro.ts`:

```ts
const rad = Math.PI / 180
const deg = 180 / Math.PI
const mod = (x: number, m: number) => ((x % m) + m) % m

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

export function sunProgress(date: Date, sunrise: number, sunset: number): number {
  const t = (date.getTime() - sunrise) / (sunset - sunrise)
  return Math.min(1, Math.max(0, t))
}

const SYNODIC = 29.530588853
const NEW_MOON_EPOCH = Date.UTC(2000, 0, 6, 18, 14)
export function moonPhase(date: Date): number {
  const days = (date.getTime() - NEW_MOON_EPOCH) / 86400000
  return mod(days / SYNODIC, 1)
}
```

- [ ] **Step 4: Run, expect PASS** — `npx vitest run tests/astro.test.ts`. If a sun test fails, re-check the formula before loosening bounds (expected noon altitude ≈ 68°).

---

### Task 4: WMO weather code mapping

**Files:**
- Create: `src/lib/weatherCodes.ts`
- Test: `tests/weatherCodes.test.ts`

**Interfaces:**
- Produces: `type Kind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder'`; `describeWeather(code: number): { kind: Kind; label: string; intensity: number }` (intensity 0–1; unknown codes → cloudy/"Cloudy"/0.5).

- [ ] **Step 1: Failing test**

```ts
import { expect, test } from 'vitest'
import { describeWeather } from '../src/lib/weatherCodes'

test('maps WMO codes', () => {
  expect(describeWeather(0)).toMatchObject({ kind: 'clear', label: 'Clear sky' })
  expect(describeWeather(2).kind).toBe('partly')
  expect(describeWeather(3).kind).toBe('cloudy')
  expect(describeWeather(45).kind).toBe('fog')
  expect(describeWeather(53).kind).toBe('drizzle')
  expect(describeWeather(63).kind).toBe('rain')
  expect(describeWeather(65).intensity).toBeGreaterThan(describeWeather(61).intensity)
  expect(describeWeather(73).kind).toBe('snow')
  expect(describeWeather(81).kind).toBe('rain')
  expect(describeWeather(95).kind).toBe('thunder')
  expect(describeWeather(99).kind).toBe('thunder')
  expect(describeWeather(12345).kind).toBe('cloudy')
})
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement**

```ts
export type Kind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder'
export interface Described { kind: Kind; label: string; intensity: number }

const T: Record<number, Described> = {
  0: { kind: 'clear', label: 'Clear sky', intensity: 0 },
  1: { kind: 'clear', label: 'Mostly clear', intensity: 0.1 },
  2: { kind: 'partly', label: 'Partly cloudy', intensity: 0.4 },
  3: { kind: 'cloudy', label: 'Overcast', intensity: 0.9 },
  45: { kind: 'fog', label: 'Fog', intensity: 0.7 },
  48: { kind: 'fog', label: 'Freezing fog', intensity: 0.9 },
  51: { kind: 'drizzle', label: 'Light drizzle', intensity: 0.2 },
  53: { kind: 'drizzle', label: 'Drizzle', intensity: 0.4 },
  55: { kind: 'drizzle', label: 'Heavy drizzle', intensity: 0.6 },
  56: { kind: 'drizzle', label: 'Freezing drizzle', intensity: 0.5 },
  57: { kind: 'drizzle', label: 'Freezing drizzle', intensity: 0.7 },
  61: { kind: 'rain', label: 'Light rain', intensity: 0.3 },
  63: { kind: 'rain', label: 'Rain', intensity: 0.6 },
  65: { kind: 'rain', label: 'Heavy rain', intensity: 1 },
  66: { kind: 'rain', label: 'Freezing rain', intensity: 0.6 },
  67: { kind: 'rain', label: 'Freezing rain', intensity: 0.9 },
  71: { kind: 'snow', label: 'Light snow', intensity: 0.3 },
  73: { kind: 'snow', label: 'Snow', intensity: 0.6 },
  75: { kind: 'snow', label: 'Heavy snow', intensity: 1 },
  77: { kind: 'snow', label: 'Snow grains', intensity: 0.4 },
  80: { kind: 'rain', label: 'Rain showers', intensity: 0.4 },
  81: { kind: 'rain', label: 'Rain showers', intensity: 0.7 },
  82: { kind: 'rain', label: 'Violent showers', intensity: 1 },
  85: { kind: 'snow', label: 'Snow showers', intensity: 0.5 },
  86: { kind: 'snow', label: 'Heavy snow showers', intensity: 0.9 },
  95: { kind: 'thunder', label: 'Thunderstorm', intensity: 0.8 },
  96: { kind: 'thunder', label: 'Thunderstorm, hail', intensity: 0.9 },
  99: { kind: 'thunder', label: 'Severe thunderstorm', intensity: 1 },
}
export const describeWeather = (code: number): Described =>
  T[code] ?? { kind: 'cloudy', label: 'Cloudy', intensity: 0.5 }
```

- [ ] **Step 4: Run, expect PASS.**

---

### Task 5: Open-Meteo client and normalizer

**Files:**
- Create: `src/lib/openMeteo.ts`
- Test: `tests/openMeteo.test.ts`

**Interfaces:**
- Consumes: `Place`, `Weather` from `types.ts`.
- Produces: `normalize(forecast: RawForecast, air: RawAir | null, now?: number): Weather`; `fetchWeather(place: Place): Promise<Weather>`; `buildForecastUrl(p: Place): string`; `buildAirUrl(p: Place): string`. Local timestamps `"2026-10-03T14:00"` convert to epoch ms via `Date.parse(s + 'Z') - utc_offset_seconds * 1000`.

- [ ] **Step 1: Failing test**

```ts
import { expect, test } from 'vitest'
import { normalize, buildForecastUrl, buildAirUrl } from '../src/lib/openMeteo'
import { placeById } from '../src/lib/places'

const forecast = {
  utc_offset_seconds: 19800,
  current: {
    time: '2026-10-03T12:00', temperature_2m: 31.4, apparent_temperature: 36.1,
    relative_humidity_2m: 62, is_day: 1, precipitation: 0, weather_code: 2,
    cloud_cover: 40, wind_speed_10m: 11.2, wind_direction_10m: 250, uv_index: 8.1,
  },
  hourly: {
    time: ['2026-10-03T12:00', '2026-10-03T13:00'],
    temperature_2m: [31.4, 32], precipitation_probability: [10, 20],
    weather_code: [2, 3], is_day: [1, 1],
  },
  daily: {
    time: ['2026-10-03'], weather_code: [3], temperature_2m_max: [33], temperature_2m_min: [24],
    sunrise: ['2026-10-03T06:02'], sunset: ['2026-10-03T17:55'],
    precipitation_probability_max: [40], uv_index_max: [9],
  },
}
const air = { current: { us_aqi: 88, pm2_5: 30.2, pm10: 55 } }

test('normalize converts local times using utc offset', () => {
  const w = normalize(forecast, air, 123)
  expect(w.fetchedAt).toBe(123)
  expect(w.current.time).toBe(Date.parse('2026-10-03T06:30:00Z'))
  expect(w.current).toMatchObject({ temp: 31.4, feelsLike: 36.1, isDay: true, code: 2, windDir: 250 })
  expect(w.hourly).toHaveLength(2)
  expect(w.hourly[1]).toMatchObject({ temp: 32, precipProb: 20, code: 3 })
  expect(w.daily[0].sunrise).toBe(Date.parse('2026-10-03T00:32:00Z'))
  expect(w.air).toEqual({ usAqi: 88, pm25: 30.2, pm10: 55 })
})
test('normalize tolerates missing air', () => {
  expect(normalize(forecast, null, 1).air).toBeNull()
})
test('urls carry coordinates and timezone=auto', () => {
  const p = placeById('khonkaen')
  expect(buildForecastUrl(p)).toContain('latitude=16.44')
  expect(buildForecastUrl(p)).toContain('timezone=auto')
  expect(buildAirUrl(p)).toContain('air-quality-api.open-meteo.com')
})
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement** `src/lib/openMeteo.ts`:

```ts
import type { Place, Weather } from './types'

/* eslint-disable @typescript-eslint/no-explicit-any */
export type RawForecast = any
export type RawAir = any

const CURRENT = 'temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,uv_index'
const HOURLY = 'temperature_2m,precipitation_probability,weather_code,is_day'
const DAILY = 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max'

export const buildForecastUrl = (p: Place) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}` +
  `&current=${CURRENT}&hourly=${HOURLY}&daily=${DAILY}` +
  `&timezone=auto&forecast_days=7&wind_speed_unit=kmh`

export const buildAirUrl = (p: Place) =>
  `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${p.lat}&longitude=${p.lon}` +
  `&current=us_aqi,pm2_5,pm10&timezone=auto`

export function normalize(f: RawForecast, a: RawAir | null, now = Date.now()): Weather {
  const off = f.utc_offset_seconds as number
  const t = (s: string) => Date.parse(s + 'Z') - off * 1000
  const c = f.current
  const h = f.hourly
  const d = f.daily
  return {
    fetchedAt: now,
    utcOffsetSeconds: off,
    current: {
      time: t(c.time), temp: c.temperature_2m, feelsLike: c.apparent_temperature,
      humidity: c.relative_humidity_2m, isDay: c.is_day === 1, precip: c.precipitation,
      code: c.weather_code, cloud: c.cloud_cover, windSpeed: c.wind_speed_10m,
      windDir: c.wind_direction_10m, uv: c.uv_index,
    },
    hourly: h.time.map((s: string, i: number) => ({
      time: t(s), temp: h.temperature_2m[i], precipProb: h.precipitation_probability[i] ?? 0,
      code: h.weather_code[i], isDay: h.is_day[i] === 1,
    })),
    daily: d.time.map((s: string, i: number) => ({
      date: t(s + 'T00:00'), code: d.weather_code[i], tMax: d.temperature_2m_max[i],
      tMin: d.temperature_2m_min[i], sunrise: t(d.sunrise[i]), sunset: t(d.sunset[i]),
      precipProbMax: d.precipitation_probability_max[i] ?? 0, uvMax: d.uv_index_max[i] ?? 0,
    })),
    air: a?.current
      ? { usAqi: a.current.us_aqi ?? null, pm25: a.current.pm2_5 ?? null, pm10: a.current.pm10 ?? null }
      : null,
  }
}

async function getJson(url: string) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Open-Meteo ${r.status}`)
  return r.json()
}

export async function fetchWeather(place: Place): Promise<Weather> {
  const [forecast, air] = await Promise.all([
    getJson(buildForecastUrl(place)),
    getJson(buildAirUrl(place)).catch(() => null),
  ])
  return normalize(forecast, air)
}
```

- [ ] **Step 4: Run, expect PASS.** Then live sanity check: `node -e "fetch('https://api.open-meteo.com/v1/forecast?latitude=17.55&longitude=80.62&current=temperature_2m&timezone=auto').then(r=>r.json()).then(j=>console.log(j.current))"` prints a current block (confirms API reachable).

---

### Task 6: `useWeather` hook and query persistence

**Files:**
- Create: `src/lib/useWeather.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `fetchWeather`, `Place`, `Weather`.
- Produces: `useWeather(place: Place): UseQueryResult<Weather>` (key `['weather', place.id]`); `queryClient` + persister exported from `src/lib/queryClient.ts`.

- [ ] **Step 1: Create `src/lib/queryClient.ts`**

```ts
import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60_000,
      gcTime: 24 * 60 * 60_000,
      refetchInterval: 10 * 60_000,
      refetchOnWindowFocus: true,
      retry: 3,
      retryDelay: (n) => Math.min(1000 * 2 ** n, 15_000),
    },
  },
})
export const persister = createSyncStoragePersister({ storage: window.localStorage })
```

- [ ] **Step 2: Create `src/lib/useWeather.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { fetchWeather } from './openMeteo'
import type { Place } from './types'

export const useWeather = (place: Place) =>
  useQuery({ queryKey: ['weather', place.id], queryFn: () => fetchWeather(place) })
```

- [ ] **Step 3: Replace `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import './index.css'
import App from './App'
import { persister, queryClient } from './lib/queryClient'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 24 * 60 * 60_000 }}>
      <App />
    </PersistQueryClientProvider>
  </StrictMode>,
)
```

- [ ] **Step 4: Temporary `src/App.tsx`** rendering `JSON.stringify` of `useWeather(placeById('kothagudem')).data?.current`. Run `npm run dev`, open the page, confirm live JSON appears; reload with devtools offline and confirm cached JSON still appears. Remove the temp render when Task 10 replaces App.

---

### Task 7: `skyState` — pure sky model

**Files:**
- Create: `src/sky/skyState.ts`
- Test: `tests/skyState.test.ts`

**Interfaces:**
- Consumes: `describeWeather`.
- Produces:
  - `type RGB = [number, number, number]`
  - `interface SkyInput { code: number; isDay: boolean; sunAltitude: number; cloudCover: number; windSpeed: number; moonPhase: number; sunProgress: number }`
  - `interface SkyState { top: RGB; mid: RGB; bottom: RGB; cloudDensity: number; cloudDarkness: number; cloudDrift: number; rain: number; snow: number; fog: number; stars: number; sunGlow: number; sunX: number; sunY: number; moonPhase: number; moonVisible: number; lightning: boolean; luminance: number }` (all 0–1 except RGB 0–255, `cloudDrift` px/s, `sunX/sunY` 0–1 of canvas)
  - `skyState(i: SkyInput): SkyState`
  - `lerpState(a: SkyState, b: SkyState, t: number): SkyState` (for cross-fade; booleans take `b`)
  - `mix(a: RGB, b: RGB, t: number): RGB`

Palette by sun altitude (degrees), interpolated linearly between stops:

| alt | top | mid | bottom |
|---|---|---|---|
| ≤ -18 | 6,9,28 | 10,16,44 | 18,24,60 |
| -6 | 24,30,84 | 70,60,130 | 232,120,110 |
| 0 | 58,66,140 | 214,110,120 | 255,168,90 |
| 8 | 96,130,208 | 244,170,140 | 255,206,140 |
| 25 | 52,126,228 | 110,176,240 | 188,222,250 |
| ≥ 50 | 30,104,222 | 84,164,242 | 170,214,250 |

Weather tint: blend toward grey (`[110,118,132]` day, `[24,28,40]` night) by `cloudiness*0.65` for cloudy/rain/snow/fog, and by up to 0.8 for thunder (extra darkening ×0.7 on RGB). Clouds: `cloudDensity = max(cloudCover/100, kindBase)` where partly=0.45, cloudy=0.95, fog=0.6, drizzle=0.8, rain=0.9, snow=0.9, thunder=1. `rain` = intensity for drizzle(×0.5)/rain/thunder; `snow` = intensity for snow; `fog` = intensity for fog; `lightning` = kind is thunder; `stars` = clamp((-6 - alt)/12) × (1 - cloudDensity×0.9); `moonVisible` = clamp((-2 - alt)/8) × (1 - cloudDensity×0.8); `sunGlow` = clamp((alt+10)/20) × (1 - cloudDensity×0.8) when alt > -10 else 0; `sunX = 0.15 + 0.7×sunProgress`, `sunY = 0.78 - 0.55×sin(π×sunProgress)` clamped to horizon when alt < 0 (sunY → 0.82); `cloudDrift = 6 + windSpeed×0.8`; `luminance` = mean of top/mid/bottom luma /255.

- [ ] **Step 1: Failing test**

```ts
import { expect, test } from 'vitest'
import { skyState, lerpState } from '../src/sky/skyState'

const base = { code: 0, isDay: true, sunAltitude: 60, cloudCover: 0, windSpeed: 5, moonPhase: 0.5, sunProgress: 0.5 }

test('clear noon is bright, no stars, strong sun glow', () => {
  const s = skyState(base)
  expect(s.luminance).toBeGreaterThan(0.4)
  expect(s.stars).toBe(0)
  expect(s.sunGlow).toBeGreaterThan(0.8)
  expect(s.cloudDensity).toBe(0)
})
test('clear midnight is dark with stars and moon', () => {
  const s = skyState({ ...base, isDay: false, sunAltitude: -40 })
  expect(s.luminance).toBeLessThan(0.15)
  expect(s.stars).toBeGreaterThan(0.9)
  expect(s.moonVisible).toBeGreaterThan(0.9)
  expect(s.sunGlow).toBe(0)
})
test('thunderstorm: lightning, heavy rain, dark clouds', () => {
  const s = skyState({ ...base, code: 95, cloudCover: 100 })
  expect(s.lightning).toBe(true)
  expect(s.rain).toBeGreaterThan(0.6)
  expect(s.cloudDensity).toBe(1)
  expect(s.luminance).toBeLessThan(skyState(base).luminance)
})
test('rain and snow are exclusive; fog sets fog', () => {
  expect(skyState({ ...base, code: 73 }).rain).toBe(0)
  expect(skyState({ ...base, code: 73 }).snow).toBeGreaterThan(0)
  expect(skyState({ ...base, code: 45 }).fog).toBeGreaterThan(0.5)
})
test('golden hour is warm: red > blue at bottom', () => {
  const s = skyState({ ...base, sunAltitude: 2, sunProgress: 0.95 })
  expect(s.bottom[0]).toBeGreaterThan(s.bottom[2])
})
test('lerpState endpoints', () => {
  const a = skyState(base), b = skyState({ ...base, isDay: false, sunAltitude: -40 })
  expect(lerpState(a, b, 0).luminance).toBeCloseTo(a.luminance)
  expect(lerpState(a, b, 1).luminance).toBeCloseTo(b.luminance)
  expect(lerpState(a, b, 0.5).luminance).toBeLessThan(a.luminance)
})
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement** `src/sky/skyState.ts` following the spec table above. Skeleton with exact logic:

```ts
import { describeWeather } from '../lib/weatherCodes'

export type RGB = [number, number, number]
export interface SkyInput {
  code: number; isDay: boolean; sunAltitude: number; cloudCover: number
  windSpeed: number; moonPhase: number; sunProgress: number
}
export interface SkyState {
  top: RGB; mid: RGB; bottom: RGB
  cloudDensity: number; cloudDarkness: number; cloudDrift: number
  rain: number; snow: number; fog: number; stars: number
  sunGlow: number; sunX: number; sunY: number
  moonPhase: number; moonVisible: number; lightning: boolean; luminance: number
}

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]

type Stop = { alt: number; top: RGB; mid: RGB; bottom: RGB }
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
    const a = STOPS[i], b = STOPS[i + 1]
    if (alt >= a.alt && alt <= b.alt) {
      const t = (alt - a.alt) / (b.alt - a.alt)
      return { top: mix(a.top, b.top, t), mid: mix(a.mid, b.mid, t), bottom: mix(a.bottom, b.bottom, t) }
    }
  }
  return last
}

const CLOUD_BASE = { clear: 0, partly: 0.45, cloudy: 0.95, fog: 0.6, drizzle: 0.8, rain: 0.9, snow: 0.9, thunder: 1 } as const
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
  const top = fin(p.top), mid = fin(p.mid), bottom = fin(p.bottom)
  const above = i.sunAltitude > 0
  const sunY = above ? 0.78 - 0.55 * Math.sin(Math.PI * i.sunProgress) : 0.82
  return {
    top, mid, bottom,
    cloudDensity,
    cloudDarkness: clamp(tintAmt + (w.kind === 'thunder' ? 0.3 : 0)),
    cloudDrift: 6 + i.windSpeed * 0.8,
    rain: w.kind === 'rain' || w.kind === 'thunder' ? w.intensity : w.kind === 'drizzle' ? w.intensity * 0.5 : 0,
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
    top: mix(a.top, b.top, t), mid: mix(a.mid, b.mid, t), bottom: mix(a.bottom, b.bottom, t),
    cloudDensity: n(a.cloudDensity, b.cloudDensity), cloudDarkness: n(a.cloudDarkness, b.cloudDarkness),
    cloudDrift: n(a.cloudDrift, b.cloudDrift), rain: n(a.rain, b.rain), snow: n(a.snow, b.snow),
    fog: n(a.fog, b.fog), stars: n(a.stars, b.stars), sunGlow: n(a.sunGlow, b.sunGlow),
    sunX: n(a.sunX, b.sunX), sunY: n(a.sunY, b.sunY), moonPhase: b.moonPhase,
    moonVisible: n(a.moonVisible, b.moonVisible), lightning: b.lightning,
    luminance: n(a.luminance, b.luminance),
  }
}
```

- [ ] **Step 4: Run, expect PASS** — `npx vitest run tests/skyState.test.ts`. If "golden hour" fails, check the alt=2 interpolation between stops at 0 and 8 (bottom red 255 vs blue ~90–140 → passes).

---

### Task 8: Sky engine (canvas renderer) — the visual centerpiece

**Files:**
- Create: `src/sky/engine.ts`, `src/sky/layers/{stars,moon,sun,clouds,rain,snow,fog,lightning}.ts`, `src/sky/noise.ts`
- Create: `src/components/SkyCanvas.tsx`

**Interfaces:**
- Consumes: `SkyState`, `lerpState`.
- Produces:
  - `class SkyEngine { constructor(canvas: HTMLCanvasElement); setState(s: SkyState): void; start(): void; stop(): void; resize(): void; destroy(): void }` — `setState` begins a 1.2 s cross-fade from the currently rendered state; engine pauses on `document.hidden`; honors `prefers-reduced-motion` (no rain/snow/stars twinkle/lightning, clouds drift at 25% speed).
  - Layer contract: `interface Layer { update(dt: number, s: SkyState, w: number, h: number): void; draw(ctx: CanvasRenderingContext2D, s: SkyState, w: number, h: number): void }` — each layer owns its own particle arrays, resizes counts based on `w*h`.
  - `<SkyCanvas state={SkyState} className?: string />` creates an engine on mount, `setState` on prop change, destroys on unmount.

Draw order each frame: (1) vertical linear gradient top→mid(at 55%)→bottom; (2) stars (≈ `w*h/4000` points, twinkle via sin, alpha `s.stars`); (3) moon (radial glow + crescent via two arcs from `moonPhase`, alpha `s.moonVisible`); (4) sun glow (large radial gradient at `sunX,sunY`, warm white core `rgba(255,244,214)` fading through `rgba(255,170,90)`, radius `0.55×w`, alpha `s.sunGlow`, plus a small bright disc) with `globalCompositeOperation='lighter'`; (5) clouds; (6) fog (3 wide horizontal soft bands drifting slowly, alpha `s.fog×0.5`, color = `mix(bottom,white,0.5)`); (7) rain (streaks, slant from wind, count `rain × w×h/1800`, length 14–28px, alpha 0.35, speed 900–1400 px/s); (8) snow (count `snow × w×h/6000`, radius 1–3.5px, sinusoidal sway, speed 40–110 px/s); (9) lightning (when `s.lightning`: random interval 3–9 s, a 2-flash white overlay alpha 0.55→0 over ~350 ms, occasionally a jagged bolt polyline from top with 6–9 segments, plus brief brightening); (10) a subtle vignette (radial, edges `rgba(0,0,0,0.25)`).

Clouds layer: pre-render 6 soft cloud sprites to offscreen canvases (each built from 8–14 overlapping radial-gradient blobs, white at alpha 0.9 → 0 edge; build a second tinted set darkened by `cloudDarkness` at draw time via `globalAlpha` + a dark overlay sprite). Maintain 3 parallax bands (far: scale 0.6, speed ×0.4, alpha 0.5, y 15–35%; mid: scale 1, ×0.8; near: scale 1.5, ×1.4, y 30–55%). Number of sprites per band = `round(cloudDensity × 7)`. Tint clouds by sun: near horizon at low altitude, multiply cloud color toward `s.bottom` mix 0.45 (use the sky `mid` color blended with white 0.6 for cloud base color). Wrap sprites horizontally.

- [ ] **Step 1: `src/sky/noise.ts`** — export seeded `mulberry32(seed)` random generator so sprite layout is deterministic per mount; test unneeded (visual).

- [ ] **Step 2: Implement layers** per the contract above, one file each, each < 120 lines.

- [ ] **Step 3: Implement `SkyEngine`** — keeps `current: SkyState` (what is drawn), `from`, `to`, `fadeT`. On `setState`, `from = current`, `to = s`, `fadeT = 0`; each frame `fadeT += dt/1.2` with ease-in-out, `current = lerpState(from, to, ease(fadeT))`. rAF loop caps dt at 50 ms. `resize()` sets `canvas.width = clientWidth × min(devicePixelRatio, 2)` and scales the context. A `ResizeObserver` calls `resize()`. A `visibilitychange` listener stops/starts the loop.

- [ ] **Step 4: `SkyCanvas.tsx`** — `canvas` with `className="absolute inset-0 h-full w-full"`; `useEffect` creates the engine once; second `useEffect([state])` calls `engine.setState(state)`. For the first state, call `setState` then skip the fade (engine exposes `snapTo(s)` used when `current` is unset).

- [ ] **Step 5: Verify build** — `npx tsc -b && npm run build` → no type errors.

---

### Task 9: Debug panel and visual verification harness

**Files:**
- Create: `src/components/DebugPanel.tsx`
- Modify: `src/App.tsx` (temporary harness until Task 10)

**Interfaces:**
- Produces: `<DebugPanel onChange={(i: SkyInput) => void} />` visible only when `location.search` contains `debug=1`: a hour slider (0–23 → sun altitude via a fake day curve `alt = 65*sin(π*(h-6)/12)` clamped to ≥ -30 outside 6–18), weather-code select (0,2,3,45,53,63,65,73,95), wind slider. `onChange` yields a `SkyInput` that App feeds to `skyState` instead of live data.

- [ ] **Step 1: Implement panel** (fixed bottom-left, `glass`, small controls).

- [ ] **Step 2: Temp App** renders a full-screen `<SkyCanvas>` driven by `DebugPanel`.

- [ ] **Step 3: Visual check in a real browser** — run `npm run dev -- --port 5173`, use the Chrome tools (load via ToolSearch) to open `http://localhost:5173/?debug=1`, and screenshot these combos: noon clear, golden hour (17h) clear, dusk (18.5h) partly cloudy, midnight clear, noon overcast, noon heavy rain, 20h thunderstorm, 6h fog, noon snow. For each, inspect: gradient smoothness (no banding), cloud softness (no hard edges), rain readable but not noisy, stars not overbearing, lightning flash isn't epilepsy-harsh (peak overlay alpha ≤ 0.55). Fix and iterate until each looks genuinely beautiful. Check console for errors via `read_console_messages`.

- [ ] **Step 4: Perf check** — in browser devtools `javascript_tool`, sample `requestAnimationFrame` deltas over 3 s on the thunderstorm preset; target median ≤ 17 ms. If higher, reduce particle counts or cache gradients.

---

### Task 10: Home screen — split sky

**Files:**
- Create: `src/components/SkyPanel.tsx`, `src/components/CoupleChip.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useWeather`, `skyState`, `sunAltitude`, `sunProgress`, `moonPhase`, `describeWeather`, `PLACES`, `placesFor`, `DEFAULT_PLACE`, `timeDiffMin`, `formatDiff`, `tempGap`, `localTime`.
- Produces:
  - `useSky(place: Place, weather: Weather | undefined, debug?: SkyInput): SkyState` — computes `SkyInput` from live data every minute (`now`), with `sunProgress` from today's sunrise/sunset (`weather.daily[0]`), then `skyState`. Fallback when no data: a neutral night-ish loading state.
  - `<SkyPanel place={Place} onOpen={() => void} onSwitch={() => void} layoutId />`: own `SkyCanvas`; top-left bilingual place name (name large 300 weight; `nameLocal` beneath in Noto Sans Thai; subtitle small caps), local time (live, ticks every 30 s), huge temperature (clamp(88px, 22vw, 168px), weight 200, number tween via Motion `animate`), condition label with small icon, feels-like + hi/lo. Skeleton shimmer while loading; "updated N min ago" if `isError` with data.
  - `<CoupleChip />`: center overlay at the horizon seam on mobile (glass pill: "TH is 1h 30m ahead · 4° warmer there"), docked between panels on desktop.
  - `App`: `view: { type: 'home' } | { type: 'detail'; owner: Owner }`, `selection: Record<Owner, string>` seeded from `DEFAULT_PLACE`, persisted in localStorage `ts.selection`.

Layout: mobile (`< 768px`) two panels stacked, each `flex-1`, 1px soft glowing divider; desktop (`>= 768px`) two columns. Place switcher: a small pill with a swap icon on each panel that cycles that owner's two places (cross-fade in sky + text via `AnimatePresence`).

- [ ] **Step 1: Implement `useSky`** in `src/sky/useSky.ts`; unit-test the pure part by extracting `buildSkyInput(weather, place, now): SkyInput` into `src/sky/buildSkyInput.ts` with a test at `tests/buildSkyInput.test.ts`:

```ts
import { expect, test } from 'vitest'
import { buildSkyInput } from '../src/sky/buildSkyInput'
import { placeById } from '../src/lib/places'

const day = 1_759_461_000_000 // 2025-10-03T03:30Z ≈ 09:00 IST
const weather = {
  fetchedAt: 0, utcOffsetSeconds: 19800,
  current: { time: day, temp: 30, feelsLike: 33, humidity: 60, isDay: true, precip: 0, code: 63, cloud: 80, windSpeed: 12, windDir: 90, uv: 5 },
  hourly: [], air: null,
  daily: [{ date: day, code: 63, tMax: 33, tMin: 24, sunrise: day - 3 * 3600_000, sunset: day + 9 * 3600_000, precipProbMax: 60, uvMax: 8 }],
}

test('builds input from weather + time', () => {
  const i = buildSkyInput(weather, placeById('kothagudem'), new Date(day))
  expect(i.code).toBe(63)
  expect(i.isDay).toBe(true)
  expect(i.cloudCover).toBe(80)
  expect(i.windSpeed).toBe(12)
  expect(i.sunProgress).toBeCloseTo(0.25, 2)
  expect(i.sunAltitude).toBeGreaterThan(20)
})
```

Implement `buildSkyInput(w, place, now)` returning `{ code: w.current.code, isDay: w.current.isDay, sunAltitude: sunAltitude(now, place.lat, place.lon), cloudCover: w.current.cloud, windSpeed: w.current.windSpeed, moonPhase: moonPhase(now), sunProgress: sunProgress(now, w.daily[0].sunrise, w.daily[0].sunset) }`. Run `npx vitest run tests/buildSkyInput.test.ts` → PASS.

- [ ] **Step 2: Implement `SkyPanel`, `CoupleChip`, `App`** per the interface block above. Use Motion `layoutId={`panel-${owner}`}` on the panel container for the later shared-element expansion.

- [ ] **Step 3: Visual check in browser** at 390×844 and 1440×900 with live data: both skies render, text readable on both bright and dark skies (add a soft text-shadow `0 2px 24px rgba(0,0,0,0.25)`), chip doesn't collide with temps, Thai glyphs render. Screenshot and fix.

---

### Task 11: Detail view

**Files:**
- Create: `src/components/Detail/{DetailView,Hourly,Daily,SunArc,WindCompass,AqiCard,Stat}.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `Weather`, `Place`, `skyState`, `describeWeather`.
- Produces: `<DetailView place weather onClose />`. Layout: full-screen sky behind; top bar (close chevron, place name); scrollable content in `glass` cards on a 2-col grid (1-col on mobile):
  1. **Hourly** — horizontal scroll, next 24 h from now: local hour, icon, temp, precip% bar. Active "Now" chip.
  2. **7-day** — rows with weekday (local), icon, precip%, range bar (min→max scaled to the week's global min/max with gradient blue→amber).
  3. **SunArc** — SVG semicircle, sun dot positioned by `sunProgress`, sunrise/sunset times at the ends, dashed path for the remaining arc, night state shows moon dot; golden gradient stroke.
  4. **WindCompass** — SVG circle with N/E/S/W ticks, rotating arrow to `windDir` (Motion spring), speed center text.
  5. **AqiCard** — `usAqi` big number, category label (Good ≤50, Moderate ≤100, Unhealthy for sensitive ≤150, Unhealthy ≤200, Very unhealthy ≤300, Hazardous), a gradient scale bar with a marker, PM2.5/PM10 values; hidden entirely when `air === null`.
  6. **Stats** — feels like, humidity, UV (label Low/Moderate/High/Very High/Extreme), precipitation (mm), cloud cover.
  Add `aqiCategory(n: number): { label: string; color: string }` and `uvLabel(n: number): string` in `src/lib/labels.ts` with tests `tests/labels.test.ts`:

```ts
import { expect, test } from 'vitest'
import { aqiCategory, uvLabel } from '../src/lib/labels'
test('aqi buckets', () => {
  expect(aqiCategory(42).label).toBe('Good')
  expect(aqiCategory(88).label).toBe('Moderate')
  expect(aqiCategory(130).label).toBe('Unhealthy for sensitive groups')
  expect(aqiCategory(180).label).toBe('Unhealthy')
  expect(aqiCategory(250).label).toBe('Very unhealthy')
  expect(aqiCategory(400).label).toBe('Hazardous')
})
test('uv labels', () => {
  expect(uvLabel(1)).toBe('Low')
  expect(uvLabel(4)).toBe('Moderate')
  expect(uvLabel(7)).toBe('High')
  expect(uvLabel(9)).toBe('Very high')
  expect(uvLabel(12)).toBe('Extreme')
})
```

Implement thresholds: UV <3 Low, <6 Moderate, <8 High, <11 Very high, else Extreme. Colors for AQI: green `#4ade80`, yellow `#facc15`, orange `#fb923c`, red `#f87171`, purple `#c084fc`, maroon `#be123c`.

- [ ] **Step 1: Write labels test, run FAIL, implement `labels.ts`, run PASS.**
- [ ] **Step 2: Build the components** per spec. Weather icons: small inline SVG set in `src/components/icons.tsx` keyed by `Kind` + day/night (sun, moon, cloud-sun, cloud, fog, drizzle, rain, snow, bolt), stroke-based, 1.5px, rounded caps.
- [ ] **Step 3: Visual check** at both viewport sizes; confirm hourly scroll snaps, arc is correct at day and night (use debug override or time mock), AQI hidden when API air is blocked (block `air-quality-api` in devtools network).

---

### Task 12: Transitions, PWA, polish, ship

**Files:**
- Modify: `src/App.tsx`, `src/components/SkyPanel.tsx`, `index.html`, `public/icon.svg`
- Create: `README.md` (how to run, deploy)

- [ ] **Step 1: Shared-element expansion** — tapping a panel animates to detail using Motion `layoutId` on the sky container (panel → full-screen), content cards stagger in (`y: 24 → 0`, `opacity 0 → 1`, 60 ms stagger). Close reverses. Respect `useReducedMotion` (fade only).
- [ ] **Step 2: Entry polish** — on load, temps tween from 0, text fades up 12 px with 80 ms stagger; skies fade in from black over 800 ms.
- [ ] **Step 3: Meta** — `index.html`: `<meta name="theme-color" content="#0b1020">`, viewport `viewport-fit=cover`, `apple-mobile-web-app-capable`, apple touch icon (reuse SVG). Use `env(safe-area-inset-*)` padding on panels.
- [ ] **Step 4: Run the full suite** — `npm test && npx tsc -b && npm run build` → all pass.
- [ ] **Step 5: Preview prod build** — `npm run preview`, open in browser, confirm service worker registers (`navigator.serviceWorker.getRegistrations()` length 1), go offline and reload: cached data + "updated N min ago" shows.
- [ ] **Step 6: README** — run (`npm run dev`), test, build, and a deploy note: static `dist/` works on Cloudflare Pages, Netlify, Vercel or GitHub Pages; both users open the URL and use "Add to Home Screen".
- [ ] **Step 7: Final visual pass** — full screenshot set across 3 viewports × (day clear, night clear, rain, thunder); fix any contrast/overflow issues found.

---

## Self-Review

**Spec coverage:** stack (T1), places + couple chip + time diff + temp gap (T2, T10), sun/moon astronomy (T3), weather mapping (T4), Open-Meteo forecast + AQI + timezone=auto (T5), TanStack caching/refetch/persist (T6), sky model and palette (T7), sky engine, layers, cross-fade, reduced motion, DPR cap, visibility pause (T8), `?debug=1` panel + visual testing (T9), split home + switcher + bilingual names (T10), detail cards: hourly, 7-day, UV, wind, humidity, precip, sun arc, AQI (T11), shared-element transition, PWA, offline label, error states (T10, T12). Errors: offline/stale label (T10), empty-state loading skeleton (T10), AQI hidden on partial failure (T5 `catch → null`, T11).

**Placeholder scan:** none. Visual tasks (T8, T10–T12) specify exact layers, parameters, sizes and acceptance checks rather than full source, because their correctness is judged visually in-browser (T9 harness); logic tasks (T2–T7, labels) have full code and tests.

**Type consistency:** `Weather`/`Place` defined in T2 and used identically in T5, T10, T11. `SkyInput`/`SkyState` defined in T7, consumed in T8–T10 (`buildSkyInput` produces `SkyInput` with the same seven fields). `describeWeather` → `Kind` consistent between T4 and T7's `CLOUD_BASE` keys.
