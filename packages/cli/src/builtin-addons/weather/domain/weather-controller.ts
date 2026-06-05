import type { HostContext } from '../../../system/host-context.js'
import { fetchIpGeolocation } from './ip-geolocation.js'
import { fetchOpenMeteoSnapshot } from './open-meteo-client.js'
import { fetchWttrInSnapshot } from './wttr-in-fallback.js'
import type { WeatherButtonConfig } from '../schemas.js'

export interface WeatherSnapshot {
  available: boolean
  humidity: number
  location: string
  source: string
  temperature: number
  weatherCode: number
  windSpeed: number
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
      config.units,
    )
  } catch {
    try {
      return await fetchWttrInSnapshot(
        coords.latitude,
        coords.longitude,
        coords.name,
        config.units,
      )
    } catch {
      return createUnavailableWeatherSnapshot('all-providers-failed')
    }
  }
}

export function createWeatherController(_options: {
  hostContext: HostContext
  config: WeatherButtonConfig
}): WeatherController {
  return { async getSnapshot: () => fetchWeatherSnapshot(_options.config) }
}
