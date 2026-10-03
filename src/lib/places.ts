import { PLACES as SHARED } from '../../shared/places.js'
import type { Owner, Place } from './types'

export const PLACES: Place[] = SHARED

export const DEFAULT_PLACE: Record<Owner, string> = { him: 'kothagudem', her: 'khonkaen' }

export const placeById = (id: string): Place => {
  const p = PLACES.find((x) => x.id === id)
  if (!p) throw new Error(`unknown place ${id}`)
  return p
}

export const placesFor = (owner: Owner) => PLACES.filter((p) => p.owner === owner)
