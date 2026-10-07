import type { AppConfig } from './types'

/**
 * Shown by "use example cities" and when the app runs without a server (npm run dev).
 * The ids carry the Open-Meteo geocoder id, so city names appear in the chosen language.
 */
export const EXAMPLE_CONFIG: AppConfig = {
  sides: [
    {
      label: 'Ana',
      places: [
        { id: 'p:g2267057', name: 'Lisbon', subtitle: 'Portugal', lat: 38.7223, lon: -9.1393, tz: 'Europe/Lisbon' },
        { id: 'p:g2735943', name: 'Porto', subtitle: 'Portugal', lat: 41.1496, lon: -8.611, tz: 'Europe/Lisbon' },
      ],
    },
    {
      label: 'Ben',
      places: [
        { id: 'p:g1850147', name: 'Tokyo', subtitle: 'Japan', lat: 35.6762, lon: 139.6503, tz: 'Asia/Tokyo' },
        { id: 'p:g1853909', name: 'Osaka', subtitle: 'Japan', lat: 34.6937, lon: 135.5023, tz: 'Asia/Tokyo' },
      ],
    },
  ],
  awake: { from: 7, to: 23 },
}
