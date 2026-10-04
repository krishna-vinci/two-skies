export type Owner = 'him' | 'her'

export interface Place {
  id: string
  name: string
  nameLocal?: string
  nameTh?: string
  subtitle?: string
  lat: number
  lon: number
  tz: string
  utcOffsetMin: number
  /** null for added (browse-only) places */
  owner: Owner | null
}

/** What the server stores for an added place; the offset is computed at runtime. */
export interface StoredPlace {
  id: string
  name: string
  nameLocal?: string
  subtitle?: string
  lat: number
  lon: number
  tz: string
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
