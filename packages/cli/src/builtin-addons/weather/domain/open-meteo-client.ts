import type { WeatherSnapshot } from './weather-controller.js'

export async function fetchOpenMeteoSnapshot(
  latitude: number,
  longitude: number,
  name: string,
): Promise<WeatherSnapshot> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m` +
    `&temperature_unit=celsius&wind_speed_unit=kmh`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`open-meteo ${response.status}`)
  }
  const json = (await response.json()) as {
    current?: {
      temperature_2m?: number
      weather_code?: number
      wind_speed_10m?: number
      relative_humidity_2m?: number
    }
  }
  const current = json.current
  if (!current || typeof current.temperature_2m !== 'number') {
    throw new Error('open-meteo: missing current data')
  }
  return {
    available: true,
    humidity: current.relative_humidity_2m ?? 0,
    location: name,
    source: 'open-meteo',
    temperature: current.temperature_2m,
    weatherCode: current.weather_code ?? 0,
    windSpeed: current.wind_speed_10m ?? 0,
  }
}
