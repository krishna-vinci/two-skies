export type Kind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder'
export interface Described {
  kind: Kind
  label: string
  intensity: number
}

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
