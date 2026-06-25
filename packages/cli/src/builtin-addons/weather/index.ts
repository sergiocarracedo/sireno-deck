import { weatherAddon } from "./buttons/weather.tsx";

export { builtinWeatherButton } from "./buttons/weather.tsx";
export {
  WeatherButtonSchema,
  WeatherLocationSchema,
  WEATHER_DEFAULT_POLL_MS,
} from "./schemas.ts";
export { fetchWeather } from "./domain/fetch.ts";
export { describeWeatherCode, WMO_CODE_TO_DESCRIPTION } from "./domain/codes.ts";
export type { WeatherButtonConfig, WeatherLocation, WeatherSnapshot } from "./schemas.ts";

export default weatherAddon;