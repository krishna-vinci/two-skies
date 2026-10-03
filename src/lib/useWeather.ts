import { useQuery } from '@tanstack/react-query'
import { fetchWeather } from './openMeteo'
import type { Place } from './types'

export const useWeather = (place: Place) =>
  useQuery({ queryKey: ['weather', place.id], queryFn: () => fetchWeather(place) })
