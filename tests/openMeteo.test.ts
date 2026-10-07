import { expect, test } from 'vitest'
import { normalize, buildForecastUrl, buildAirUrl, buildEnsembleUrl } from '../src/lib/openMeteo'
import { ensembleRainProb } from '../shared/rules.js'
import { chiangmai } from './fixtures'

const forecast = {
  utc_offset_seconds: 19800,
  current: {
    time: '2026-10-03T12:00',
    temperature_2m: 31.4,
    apparent_temperature: 36.1,
    relative_humidity_2m: 62,
    is_day: 1,
    precipitation: 0,
    weather_code: 2,
    cloud_cover: 40,
    wind_speed_10m: 11.2,
    wind_direction_10m: 250,
    uv_index: 8.1,
    wet_bulb_temperature_2m: 25.5,
  },
  minutely_15: { time: ['2026-10-03T12:00', '2026-10-03T12:15'], precipitation: [0, 0.4] },
  hourly: {
    time: ['2026-10-03T12:00', '2026-10-03T13:00'],
    temperature_2m: [31.4, 32],
    precipitation_probability: [10, 20],
    weather_code: [2, 3],
    is_day: [1, 1],
    cape: [1700, 2800],
    lifted_index: [-4.7, -5.5],
    wet_bulb_temperature_2m: [25.5, 26],
  },
  daily: {
    time: ['2026-10-03'],
    weather_code: [3],
    temperature_2m_max: [33],
    temperature_2m_min: [24],
    apparent_temperature_max: [39.5],
    sunrise: ['2026-10-03T06:02'],
    sunset: ['2026-10-03T17:55'],
    precipitation_probability_max: [40],
    uv_index_max: [9],
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
  expect(w.minutely).toEqual([
    { time: Date.parse('2026-10-03T06:30:00Z'), precip: 0 },
    { time: Date.parse('2026-10-03T06:45:00Z'), precip: 0.4 },
  ])
  expect(w.daily[0].apparentMax).toBe(39.5)
})
test('normalize tolerates missing air', () => {
  expect(normalize(forecast, null, 1).air).toBeNull()
})
test('forecast url asks for 15-minute rain', () => {
  expect(buildForecastUrl(chiangmai)).toContain('minutely_15=precipitation')
})
test('urls carry coordinates and timezone=auto', () => {
  const p = chiangmai
  expect(buildForecastUrl(p)).toContain('latitude=18.7904')
  expect(buildForecastUrl(p)).toContain('timezone=auto')
  expect(buildAirUrl(p)).toContain('air-quality-api.open-meteo.com')
})

test('normalize carries cape, lifted index, wet bulb and rain probability', () => {
  const rp = [{ time: 1, p: 0.5 }]
  const w = normalize(forecast, air, 1, rp)
  expect(w.current.wetBulb).toBe(25.5)
  expect(w.hourly[1]).toMatchObject({ cape: 2800, liftedIndex: -5.5, wetBulb: 26 })
  expect(w.rainProb).toEqual(rp)
  expect(normalize(forecast, air, 1).rainProb).toBeUndefined()
})

test('ensemble parse: share of wet members per hour, ignoring nulls', () => {
  const j = {
    utc_offset_seconds: 25200,
    hourly: {
      time: ['2026-10-03T12:00', '2026-10-03T13:00'],
      precipitation: [0, 1],
      precipitation_member01: [0.5, 0],
      precipitation_member02: [0.1, null],
      precipitation_member03: [2, 0.3],
    },
  }
  const r = ensembleRainProb(j)
  expect(r[0]).toEqual({ time: Date.parse('2026-10-03T05:00:00Z'), p: 0.5 }) // 2 of 4 >= 0.2
  expect(r[1].p).toBeCloseTo(2 / 3) // 2 of 3 non-null
  expect(ensembleRainProb(undefined)).toEqual([])
  expect(buildEnsembleUrl({ lat: 1, lon: 2 } as never)).toContain('ecmwf_ifs025')
})
