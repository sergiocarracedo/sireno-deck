import { weatherAddon } from "./buttons/weather";

export { builtinWeatherButton } from "./buttons/weather";
export {
  WeatherButtonSchema,
  WeatherLocationSchema,
  WEATHER_DEFAULT_POLL_MS,
} from "./schemas";
export { fetchWeather } from "./domain/fetch";
export { describeWeatherCode, WMO_CODE_TO_DESCRIPTION } from "./domain/codes";
export { createPoller } from "./poller";
export type { WeatherButtonConfig, WeatherLocation, WeatherSnapshot } from "./schemas";

export default weatherAddon;