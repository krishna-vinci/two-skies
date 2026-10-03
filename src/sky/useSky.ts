import { useMemo } from 'react'
import { useNow } from '../lib/hooks'
import type { Place, Weather } from '../lib/types'
import { buildSkyInput } from './buildSkyInput'
import { skyState, type SkyInput } from './skyState'

export function useSky(place: Place, weather: Weather | undefined, override?: SkyInput | null) {
  const now = useNow(60_000)
  return useMemo(
    () => skyState(override ?? buildSkyInput(weather, place, now)),
    [weather, place, now, override],
  )
}
