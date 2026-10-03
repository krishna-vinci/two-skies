# Two-Sky Weather App — Design

Private PWA for two users: one in Kothagudem/Hyderabad (India), one in Khon Kaen/Bangkok (Thailand). Visual quality is the first priority.

## Stack
| Layer | Choice |
|---|---|
| App | React + TypeScript + Vite |
| Styling | Tailwind CSS + custom CSS (glass, gradients) |
| UI motion | Motion (framer-motion successor) |
| Data | TanStack Query + Open-Meteo forecast and air-quality APIs (no key) |
| Sky engine | Custom TS module, Canvas 2D + WebGL, own rAF loop, mounted by a thin React component |
| PWA | vite-plugin-pwa |

No backend. Places are hardcoded coordinates, not geocoded.

## Places
| Owner | Place | Lat, Lon | TZ |
|---|---|---|---|
| Him (main) | Kothagudem · Sujatha Nagar | 17.55, 80.62 | Asia/Kolkata |
| Him | Hyderabad | 17.385, 78.487 | Asia/Kolkata |
| Her (main) | Khon Kaen / ขอนแก่น | 16.44, 102.84 | Asia/Bangkok |
| Her | Bangkok / กรุงเทพฯ | 13.75, 100.50 | Asia/Bangkok |

## Screens
1. **Home — split sky.** Phone: his main place on top, hers below, two live skies meeting at a soft horizon. Desktop: side-by-side panels. Each half shows temp, condition, local time. A switcher on each side swaps to that person's other place. Centre chip: time difference (TH is 1h30m ahead) and temperature gap.
2. **Detail.** Tap a half to expand (shared-element transition via Motion). Hourly strip (24h), 7-day, feels-like, UV, wind compass, humidity, precipitation chance, sunrise/sunset arc, AQI (PM2.5, US AQI).
3. No settings screen. Units fixed: °C, km/h.

## Sky engine
Input: `{ weatherCode, isDay, sunAltitude, cloudCover, precip, windSpeed, moonPhase }`.
- Palette: gradient blended between dawn, day, golden hour, dusk, night keyed by sun altitude, then tinted by weather (overcast desaturates, storm darkens).
- Layers (back to front): stars + moon, sun glow/bloom, parallax clouds (count/opacity from cloud cover, drift from wind), fog, rain streaks, snow (kept for completeness), lightning flash.
- Perf: devicePixelRatio capped at 2, particle counts scaled by viewport, pause when tab hidden, `prefers-reduced-motion` drops particles to a static gradient + gentle cloud drift.
- State changes (new weather, place switch) cross-fade over ~1.2s; never hard cut.
- Pure functions (`skyState(input) -> palette + layer params`) separated from rendering so they are unit-testable.

## Data flow
- `useWeather(place)` = TanStack Query, key by place id, `staleTime` 10 min, `refetchInterval` 10 min, refetch on focus, retry with backoff. Fetches forecast (current, hourly, daily) and air-quality in parallel; one normalized model returned.
- Query cache persisted to localStorage so first paint after reopening shows last data instantly, then refreshes.
- Sun altitude computed locally from lat/lon/time (no extra API); moon phase computed locally.
- Open-Meteo `timezone=auto` so hourly/daily align to each place's local time.

## Errors
Offline or API failure: show cached data with a subtle "updated 14 min ago" label; no cache: friendly in-sky empty state with retry. Partial failure (air quality down) hides only the AQI card.

## Testing
- Unit (Vitest): weather-code mapping, `skyState`, sun altitude, moon phase, time-difference/temp-gap helpers, response normalizer against recorded fixtures.
- Visual: run in real browser, screenshot each time-of-day x condition via a dev-only override panel (`?debug=1`) that forces weather code + hour, and review.

## Out of scope
Accounts, push notifications, maps/radar, settings, unit toggles, geocoding search.
