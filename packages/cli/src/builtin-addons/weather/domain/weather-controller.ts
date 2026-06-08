import type { HostContext } from '@/system/host-context'
import type { WeatherButtonConfig } from '../schemas'
import { fetchIpGeolocation } from './ip-geolocation'
import { fetchOpenMeteoSnapshot } from './open-meteo-client'
import { fetchWttrInSnapshot } from './wttr-in-fallback'

// Units are metric only
export interface HourlyForecastEntry {
  time: string // 2-digit local hour, e.g. '14'
  temperature: number // C
  weatherCode: number
  precipitationChance: number // 0-100
}

export interface WeatherSnapshot {
  available: boolean
  humidity: number
  location: string
  source: string
  temperature: number // C
  weatherCode: number
  windSpeed: number // km/h
  hourly: HourlyForecastEntry[]
}

export function createUnavailableWeatherSnapshot(
  source: string,
): WeatherSnapshot {
  return {
    available: false,
    humidity: 0,
    location: '',
    source,
    temperature: 0,
    weatherCode: 0,
    windSpeed: 0,
    hourly: [],
  }
}

export interface WeatherController {
  getSnapshot: () => Promise<WeatherSnapshot>
}

async function resolveCoordinates(config: WeatherButtonConfig): Promise<{
  latitude: number
  longitude: number
  name: string
} | null> {
  if (typeof config.location === 'string') {
    return null
  }
  if (config.location) {
    return {
      latitude: config.location.latitude,
      longitude: config.location.longitude,
      name: config.location.name ?? '',
    }
  }
  if (config.use_ip_geolocation) {
    return await fetchIpGeolocation()
  }
  return null
}

export async function fetchWeatherSnapshot(
  config: WeatherButtonConfig,
): Promise<WeatherSnapshot> {
  const coords = await resolveCoordinates(config)
  if (!coords) {
    return createUnavailableWeatherSnapshot('no-location')
  }
  try {
    return await fetchOpenMeteoSnapshot(
      coords.latitude,
      coords.longitude,
      coords.name,
    )
  } catch {
    try {
      return await fetchWttrInSnapshot(
        coords.latitude,
        coords.longitude,
        coords.name,
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
