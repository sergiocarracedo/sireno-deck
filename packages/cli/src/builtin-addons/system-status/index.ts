import type { AddonManifestV1 } from "@/addon/api"

import systemStatusBackend from "./buttons/system-status/backend"
import systemStatusFrontend from "./buttons/system-status/frontend"

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "system-status",
  buttonTypes: {
    "system-status:status": {
      frontend: systemStatusFrontend,
      service: systemStatusBackend,
    },
  },
  publishIntervalMs: 1000,
}

export const systemStatusAddon = manifest
export default manifest
