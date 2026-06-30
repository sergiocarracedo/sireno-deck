import type { NewAddonManifest } from "@/addon/api";

import { WeatherButtonFrontend } from "./buttons/weather.frontend";
import { weatherButtonBackend } from "./buttons/weather";

export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: "weather",
  frontend: { main: "./index" },
  kind: "runtime",
  buttonTypes: {
    "core:weather": {
      frontend: WeatherButtonFrontend,
      backend: weatherButtonBackend,
    },
  },
  publishIntervalMs: 600_000,
};

export const weatherAddon = manifest;
export default weatherAddon;
export const WeatherButtonBackend = weatherButtonBackend;
export type { WeatherButtonConfig, WeatherSnapshot } from "./buttons/weather";
