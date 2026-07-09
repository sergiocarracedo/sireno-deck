import type { WeatherLocation } from '../buttons/weather/config'

const units = ['metric', 'imperial'] as const
type Units = (typeof units)[number]

export interface CityEntry {
  readonly location: WeatherLocation
  readonly units: Units
}

export type HourlyForecastEntry = {
  readonly time: string
  readonly temperature: number
  readonly description?: string
  readonly wmoCode?: number
  readonly precipitationChance?: number
}

export type DailyForecastEntry = {
  readonly date: string
  readonly tempMin: number
  readonly tempMax: number
  readonly description?: string
  readonly wmoCode?: number
  readonly precipitationSum?: number
}

export type WeatherSnapshot = {
  readonly available: boolean
  readonly temperature?: number
  readonly windSpeed?: number
  readonly description?: string
  readonly units: Units
  readonly wmoCode?: number
  readonly hourly?: ReadonlyArray<HourlyForecastEntry>
  readonly daily?: ReadonlyArray<DailyForecastEntry>
  }>
}
