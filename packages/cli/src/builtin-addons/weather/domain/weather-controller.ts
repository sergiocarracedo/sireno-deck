import type { HostContext } from '@/system/host-context'
import type { WeatherButtonConfig } from '../schemas'
import { searchCity } from './geocoder'
import { fetchOpenMeteoSnapshot } from './open-meteo-client'
import { fetchWttrInSnapshot } from './wttr-in-fallback'

export type WeatherSnapshotStatus = 'locating' | 'available' | 'unavailable'

export interface HourlyForecastEntry {
  time: string // 2-digit local hour, e.g. '14'
  temperature: number // C
  weatherCode: number
  precipitationChance: number // 0-100
}

export interface WeatherSnapshot {
  status: WeatherSnapshotStatus
  humidity: number
  location: string
  source: string
  temperature: number // C
  weatherCode: number
  windSpeed: number // km/h
  hourly: HourlyForecastEntry[]
}

export type WeatherLocation =
  | {
      kind: 'coords'
      latitude: number
      longitude: number
      name: string
    }
  | {
      kind: 'name'
      latitude: number
      longitude: number
      name: string
      country: string
      timezone: string
    }

export function createLocatingWeatherSnapshot(): WeatherSnapshot {
  return {
    status: 'locating',
    source: 'locating',
    humidity: 0,
    location: '',
    temperature: 0,
    weatherCode: 0,
    windSpeed: 0,
    hourly: [],
  }
}

export function createUnavailableWeatherSnapshot(
  source: string,
): WeatherSnapshot {
  return {
    status: 'unavailable',
    source,
    humidity: 0,
    location: '',
    temperature: 0,
    weatherCode: 0,
    windSpeed: 0,
    hourly: [],
  }
}

export interface WeatherController {
  getSnapshot: () => Promise<WeatherSnapshot>
}

export async function resolveLocation(
  config: WeatherButtonConfig,
  options?: { signal?: AbortSignal },
): Promise<WeatherLocation | null> {
  if (typeof config.location === 'string') {
    const result = await searchCity(config.location, options)
    if (!result) return null
    return {
      kind: 'name',
      latitude: result.latitude,
      longitude: result.longitude,
      name: result.name,
      country: result.country,
      timezone: result.timezone,
    }
  }
  if (config.location) {
    return {
      kind: 'coords',
      latitude: config.location.latitude,
      longitude: config.location.longitude,
      name: config.location.name ?? '',
    }
  }
  return null
}

export async function fetchWeatherSnapshot(
  config: WeatherButtonConfig,
  options?: { signal?: AbortSignal },
): Promise<WeatherSnapshot> {
  const loc = await resolveLocation(config, options)
  if (!loc) {
    const source =
      typeof config.location === 'string' ? 'location-not-found' : 'no-location'
    return createUnavailableWeatherSnapshot(source)
  }
  try {
    return await fetchOpenMeteoSnapshot(
      loc.latitude,
      loc.longitude,
      loc.name,
    )
  } catch {
    try {
      return await fetchWttrInSnapshot(
        loc.latitude,
        loc.longitude,
        loc.name,
      )
    } catch {
      return createUnavailableWeatherSnapshot('all-providers-failed')
    }
  }
}

export function createWeatherController(options: {
  hostContext: HostContext
  config: WeatherButtonConfig
}): WeatherController {
  const { config } = options
  return { getSnapshot: () => fetchWeatherSnapshot(config) }
}
