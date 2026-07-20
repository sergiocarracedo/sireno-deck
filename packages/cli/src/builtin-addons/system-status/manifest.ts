import type { AddonManifestV1 } from "@/addon/api"

import cpuFrontend from "./buttons/cpu/frontend"
import ramFrontend from "./buttons/ram/frontend"
import diskFrontend from "./buttons/disk/frontend"
import netFrontend from "./buttons/net/frontend"

export const systemStatusManifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "system-status",
  buttonTypes: {
    "system-status:cpu": {
      frontend: cpuFrontend,
      service: { configSchema: {}, internal: false },
    },
    "system-status:ram": {
      frontend: ramFrontend,
      service: { configSchema: {}, internal: false },
    },
    "system-status:disk": {
      frontend: diskFrontend,
      service: { configSchema: {}, internal: false },
    },
    "system-status:net": {
      frontend: netFrontend,
      service: { configSchema: {}, internal: false },
    },
  },
  publishIntervalMs: 1000,
}

export const systemStatusButtonTypes = [
  "system-status:cpu",
  "system-status:ram",
  "system-status:disk",
  "system-status:net",
] as const

export const systemStatusAddon = systemStatusManifest
export default systemStatusManifest
