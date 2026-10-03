import type { Owner, Place } from './types'

export const PLACES: Place[] = [
  { id: 'kothagudem', name: 'Kothagudem', subtitle: 'Sujatha Nagar', lat: 17.55, lon: 80.62, tz: 'Asia/Kolkata', utcOffsetMin: 330, owner: 'him' },
  { id: 'hyderabad', name: 'Hyderabad', lat: 17.385, lon: 78.487, tz: 'Asia/Kolkata', utcOffsetMin: 330, owner: 'him' },
  { id: 'khonkaen', name: 'Khon Kaen', nameLocal: 'ขอนแก่น', lat: 16.44, lon: 102.84, tz: 'Asia/Bangkok', utcOffsetMin: 420, owner: 'her' },
  { id: 'bangkok', name: 'Bangkok', nameLocal: 'กรุงเทพฯ', lat: 13.75, lon: 100.5, tz: 'Asia/Bangkok', utcOffsetMin: 420, owner: 'her' },
]

export const DEFAULT_PLACE: Record<Owner, string> = { him: 'kothagudem', her: 'khonkaen' }

export const placeById = (id: string): Place => {
  const p = PLACES.find((x) => x.id === id)
  if (!p) throw new Error(`unknown place ${id}`)
  return p
}

export const placesFor = (owner: Owner) => PLACES.filter((p) => p.owner === owner)
