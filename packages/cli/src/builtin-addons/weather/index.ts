import type { AddonManifestV1 } from "@/addon/api"

import weatherBackend from "./buttons/weather/backend"
import weatherFrontend from "./buttons/weather/frontend"

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "weather",
  buttonTypes: {
    "weather:weather": {
      frontend: weatherFrontend,
      service: { ...weatherBackend, gestureHandlers: ["tap"] as const },
    },
  },
  publishIntervalMs: 600_000,
}

export const weatherAddon = manifest
export default manifest
