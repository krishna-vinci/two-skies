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
  owner: Owner
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
  }
  /** 15-minute precipitation (mm per slot); absent in older cached data */
  minutely?: { time: number; precip: number }[]
  hourly: { time: number; temp: number; precipProb: number; code: number; isDay: boolean }[]
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
