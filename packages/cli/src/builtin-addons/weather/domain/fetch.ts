import type { WeatherButtonConfig, WeatherLocation, WeatherSnapshot } from "../schemas.ts";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export const fetchWeather = async (
  location: WeatherLocation,
  units: WeatherButtonConfig["units"],
  signal?: AbortSignal,
): Promise<WeatherSnapshot> => {
  const tempUnit = units === "imperial" ? "fahrenheit" : "celsius";
  const windUnit = units === "imperial" ? "mph" : "kmh";
  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("current", "temperature_2m,wind_speed_10m,weather_code");
  url.searchParams.set("temperature_unit", tempUnit);
  url.searchParams.set("wind_speed_unit", windUnit);
  const response = await fetch(url.toString(), { signal });
  if (!response.ok) {
    throw new Error(`Open-Meteo HTTP ${response.status}`);
  }
  const json = (await response.json()) as {
    current?: { temperature_2m?: number; wind_speed_10m?: number; weather_code?: number };
  };
  const current = json.current ?? {};
  return {
    available: true,
    temperature: current.temperature_2m,
    windSpeed: current.wind_speed_10m,
    description:
      current.weather_code !== undefined
        ? `${current.weather_code}`
        : undefined,
    units,
  };
};