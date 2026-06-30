import type { NewAddonManifest } from "@/addon/api";

import manifestJson from "./sirenodeck.json" with { type: "json" };

import weatherBackend from "./buttons/weather/backend";
import weatherFrontend from "./buttons/weather/frontend";

export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: manifestJson.name,
  buttonTypes: {
    "weather:weather": {
      frontend: weatherFrontend,
      backend: weatherBackend,
    },
  },
  publishIntervalMs: 600_000,
};

export const weatherAddon = manifest;
export default manifest;