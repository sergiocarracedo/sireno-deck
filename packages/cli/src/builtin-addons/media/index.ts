import type { AddonManifestV1 } from "@/addon/api"

import { globalService } from "./backend"
import mediaPlayerBackend from "./buttons/media-player/backend"
import mediaPlayerFrontend from "./buttons/media-player/frontend"
import mediaMuteBackend from "./buttons/volume/mute/backend"
import mediaMuteFrontend from "./buttons/volume/mute/frontend"
import volumeDownBackend from "./buttons/volume/volume-down/backend"
import volumeDownFrontend from "./buttons/volume/volume-down/frontend"
import volumeUpBackend from "./buttons/volume/volume-up/backend"
import volumeUpFrontend from "./buttons/volume/volume-up/frontend"

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "media",
  buttonTypes: {
    "media:player": {
      frontend: mediaPlayerFrontend,
      service: { ...mediaPlayerBackend, gestureHandlers: ["tap"] as const },
    },
    "media:mute": {
      frontend: mediaMuteFrontend,
      service: { ...mediaMuteBackend, gestureHandlers: ["tap"] as const },
    },
    "media:volume:up": {
      frontend: volumeUpFrontend,
      service: { ...volumeUpBackend, gestureHandlers: ["tap"] as const },
    },
    "media:volume:down": {
      frontend: volumeDownFrontend,
      service: { ...volumeDownBackend, gestureHandlers: ["tap"] as const },
    },
  },
  globalService,
}

export default manifest
