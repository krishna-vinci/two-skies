/** The two skies being watched. */
export type Side = 'a' | 'b'

export interface Place {
  id: string
  /** English / Latin name */
  name: string
  /** Names in other languages, by language code ({ th: 'เชียงใหม่' }); `name` is the default */
  names?: Record<string, string>
  subtitle?: string
  lat: number
  lon: number
  tz: string
  utcOffsetMin: number
}

/** What the server stores for a place; the UTC offset is computed at runtime. */
export interface StoredPlace {
  id: string
  name: string
  names?: Record<string, string>
  subtitle?: string
  lat: number
  lon: number
  tz: string
}

export interface SideConfig {
  /** Optional name for this side ("Ana", "Mum", "Me") */
  label?: string
  /** 1-3 cities; the first is the default */
  places: StoredPlace[]
}

export interface AppConfig {
  sides: [SideConfig, SideConfig]
  /** Assumed waking hours (local), used by the Together screen */
  awake: { from: number; to: number }
}

export interface Weather {
  fetchedAt: number
  utcOffsetSeconds: number
  current: {
    time: number
    temp: number
    feelsLike: number
    humidity: number
    isDay: boolean
    precip: number
    code: number
    cloud: number
    windSpeed: number
    windDir: number
    uv: number
    wetBulb?: number
  }
  /** Share of ensemble members wet, per hour (absent if the ensemble call failed) */
  rainProb?: { time: number; p: number }[]
  /** 15-minute precipitation (mm per slot); absent in older cached data */
  minutely?: { time: number; precip: number }[]
  hourly: {
    time: number
    temp: number
    precipProb: number
    code: number
    isDay: boolean
    cape?: number
    liftedIndex?: number
    wetBulb?: number
  }[]
  daily: {
    date: number
    code: number
    tMax: number
    tMin: number
    sunrise: number
    sunset: number
    precipProbMax: number
    uvMax: number
    apparentMax?: number
  }[]
  air: { usAqi: number | null; pm25: number | null; pm10: number | null } | null
}
