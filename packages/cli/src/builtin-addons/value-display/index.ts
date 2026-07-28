import type { AddonManifestV1 } from "@/addon/api"

import { globalService } from "./backend"
import valueDisplayBackend from "./buttons/value-display/backend"
import valueDisplayFrontend from "./buttons/value-display/frontend"

export { globalService }

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "value-display",
  buttonTypes: {
    "value-display:display": {
      frontend: valueDisplayFrontend,
      service: valueDisplayBackend,
    },
  },
  publishIntervalMs: 5000,
  globalService,
}

export const valueDisplayAddon = manifest
export default manifest
