import { ensembleRainProb } from '../../shared/rules.js'
import type { Place, Weather } from './types'

/* eslint-disable @typescript-eslint/no-explicit-any */
export type RawForecast = any
export type RawAir = any

const CURRENT =
  'temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,uv_index,wet_bulb_temperature_2m'
const HOURLY = 'temperature_2m,precipitation_probability,weather_code,is_day,cape,lifted_index,wet_bulb_temperature_2m'
const DAILY =
  'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,sunrise,sunset,precipitation_probability_max,uv_index_max'

export const buildForecastUrl = (p: Place) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}` +
  `&current=${CURRENT}&hourly=${HOURLY}&daily=${DAILY}` +
  `&minutely_15=precipitation&forecast_minutely_15=8` +
  `&timezone=auto&forecast_days=7&wind_speed_unit=kmh`

export const buildAirUrl = (p: Place) =>
  `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${p.lat}&longitude=${p.lon}` +
  `&current=us_aqi,pm2_5,pm10&timezone=auto`

export const buildEnsembleUrl = (p: Place) =>
  `https://ensemble-api.open-meteo.com/v1/ensemble?latitude=${p.lat}&longitude=${p.lon}` +
  `&hourly=precipitation&models=ecmwf_ifs025&forecast_hours=12&timezone=auto`

export function normalize(
  f: RawForecast,
  a: RawAir | null,
  now = Date.now(),
  rainProb?: { time: number; p: number }[],
): Weather {
  const off = f.utc_offset_seconds as number
  const t = (s: string) => Date.parse(s + 'Z') - off * 1000
  const c = f.current
  const h = f.hourly
  const d = f.daily
  return {
    fetchedAt: now,
    utcOffsetSeconds: off,
    current: {
      time: t(c.time),
      temp: c.temperature_2m,
      feelsLike: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      isDay: c.is_day === 1,
      precip: c.precipitation,
      code: c.weather_code,
      cloud: c.cloud_cover,
      windSpeed: c.wind_speed_10m,
      windDir: c.wind_direction_10m,
      uv: c.uv_index,
      wetBulb: c.wet_bulb_temperature_2m,
    },
    rainProb: rainProb?.length ? rainProb : undefined,
    minutely: f.minutely_15?.time?.map((s: string, i: number) => ({
      time: t(s),
      precip: f.minutely_15.precipitation[i] ?? 0,
    })),
    hourly: h.time.map((s: string, i: number) => ({
      time: t(s),
      temp: h.temperature_2m[i],
      precipProb: h.precipitation_probability[i] ?? 0,
      code: h.weather_code[i],
      isDay: h.is_day[i] === 1,
      cape: h.cape?.[i],
      liftedIndex: h.lifted_index?.[i],
      wetBulb: h.wet_bulb_temperature_2m?.[i],
    })),
    daily: d.time.map((s: string, i: number) => ({
      date: t(s + 'T00:00'),
      code: d.weather_code[i],
      tMax: d.temperature_2m_max[i],
      tMin: d.temperature_2m_min[i],
      sunrise: t(d.sunrise[i]),
      sunset: t(d.sunset[i]),
      precipProbMax: d.precipitation_probability_max[i] ?? 0,
      uvMax: d.uv_index_max[i] ?? 0,
      apparentMax: d.apparent_temperature_max?.[i],
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
  const [forecast, air, ensemble] = await Promise.all([
    getJson(buildForecastUrl(place)),
    getJson(buildAirUrl(place)).catch(() => null),
    getJson(buildEnsembleUrl(place)).catch(() => null),
  ])
  return normalize(forecast, air, Date.now(), ensemble ? ensembleRainProb(ensemble) : undefined)
}
