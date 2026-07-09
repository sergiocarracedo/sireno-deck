import type {
  DailyForecastEntry,
  HourlyForecastEntry,
  WeatherButtonConfig,
  WeatherSnapshot,
} from "../buttons/weather/config"

import type { GeocodedLocation } from "./geocode"
import { describeWeatherCode } from "./codes"

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

export const fetchWeather = async (
  location: GeocodedLocation,
  units: WeatherButtonConfig["units"],
  signal?: AbortSignal,
): Promise<WeatherSnapshot> => {
  const tempUnit = units === "imperial" ? "fahrenheit" : "celsius"
  const windUnit = units === "imperial" ? "mph" : "kmh"
  const url = new URL(OPEN_METEO_URL)
  url.searchParams.set("latitude", String(location.latitude))
  url.searchParams.set("longitude", String(location.longitude))
  url.searchParams.set("current", "temperature_2m,wind_speed_10m,weather_code")
  url.searchParams.set(
    "hourly",
    "temperature_2m,weather_code,precipitation_probability",
  )
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
  )
  url.searchParams.set("temperature_unit", tempUnit)
  url.searchParams.set("wind_speed_unit", windUnit)
  url.searchParams.set("timezone", "auto")
  url.searchParams.set("forecast_days", "7")
  const response = await fetch(url.toString(), { signal })
  if (!response.ok) {
    throw new Error(`Open-Meteo HTTP ${response.status}`)
  }
  const json = (await response.json()) as {
    current?: {
      temperature_2m?: number
      wind_speed_10m?: number
      weather_code?: number
    }
    hourly?: {
      time?: string[]
      temperature_2m?: number[]
      weather_code?: number[]
      precipitation_probability?: number[]
    }
    daily?: {
      time?: string[]
      weather_code?: number[]
      temperature_2m_max?: number[]
      temperature_2m_min?: number[]
      precipitation_sum?: number[]
    }
  }
  const current = json.current ?? {}
  const hourly: HourlyForecastEntry[] = []
  if (json.hourly?.time && json.hourly.temperature_2m) {
    for (let i = 0; i < Math.min(24, json.hourly.time.length); i++) {
      const hour = new Date(json.hourly.time[i]!).getHours()
      if (!isNaN(hour)) {
        hourly.push({
          time: hour.toString().padStart(2, "0"),
          temperature: json.hourly.temperature_2m[i] ?? 0,
          weatherCode: json.hourly.weather_code?.[i] ?? 0,
          precipitationChance: json.hourly.precipitation_probability?.[i] ?? 0,
        })
      }
    }
  }
  const daily: DailyForecastEntry[] = []
  if (json.daily?.time) {
    for (let i = 0; i < json.daily.time.length; i++) {
      daily.push({
        date: json.daily.time[i] ?? "",
        weatherCode: json.daily.weather_code?.[i] ?? 0,
        tempMax: json.daily.temperature_2m_max?.[i] ?? 0,
        tempMin: json.daily.temperature_2m_min?.[i] ?? 0,
        precipitationSum: json.daily.precipitation_sum?.[i] ?? 0,
      })
    }
  }
  return {
    available: true,
    temperature: current.temperature_2m,
    windSpeed: current.wind_speed_10m,
    description:
      current.weather_code !== undefined
        ? describeWeatherCode(current.weather_code)
        : undefined,
    wmoCode: current.weather_code,
    units,
    hourly,
    daily,
  }
}
