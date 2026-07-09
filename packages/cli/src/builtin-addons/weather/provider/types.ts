import type { WeatherLocation } from "../buttons/weather/config"

export interface CityEntry {
  readonly location: WeatherLocation
  readonly units: "metric" | "imperial"
}
