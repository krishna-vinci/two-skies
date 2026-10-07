import type { AppConfig } from './types'

/** Shown by "use example cities" and when the app runs without a server (npm run dev). */
export const EXAMPLE_CONFIG: AppConfig = {
  sides: [
    {
      label: 'Ana',
      places: [
        { id: 'ex:lisbon', name: 'Lisbon', nameTh: 'ลิสบอน', subtitle: 'Portugal', lat: 38.7223, lon: -9.1393, tz: 'Europe/Lisbon' },
        { id: 'ex:porto', name: 'Porto', nameTh: 'ปอร์โต', subtitle: 'Portugal', lat: 41.1496, lon: -8.611, tz: 'Europe/Lisbon' },
      ],
    },
    {
      label: 'Ben',
      places: [
        { id: 'ex:tokyo', name: 'Tokyo', nameTh: 'โตเกียว', subtitle: 'Japan', lat: 35.6762, lon: 139.6503, tz: 'Asia/Tokyo' },
        { id: 'ex:osaka', name: 'Osaka', nameTh: 'โอซากา', subtitle: 'Japan', lat: 34.6937, lon: 135.5023, tz: 'Asia/Tokyo' },
      ],
    },
  ],
  awake: { from: 7, to: 23 },
}
