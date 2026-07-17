import type { AddonManifestV1 } from "@/addon/api"

import sessionInfoBackend from "./buttons/session-info/backend"
import sessionInfoFrontend from "./buttons/session-info/frontend"

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "session",
  buttonTypes: {
    "session:info": {
      frontend: sessionInfoFrontend,
      service: { ...sessionInfoBackend, gestureHandlers: ["tap"] as const },
    },
  },
}

export const sessionAddon = manifest
export default manifest