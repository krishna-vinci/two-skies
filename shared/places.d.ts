export interface SharedPlace {
  id: string
  name: string
  nameLocal?: string
  nameTh?: string
  subtitle?: string
  lat: number
  lon: number
  tz: string
  utcOffsetMin: number
  owner: 'him' | 'her'
}
export const PLACES: SharedPlace[]
