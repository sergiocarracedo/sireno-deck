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
      service: {
        ...mediaPlayerBackend,
        gestureHandlers: ["tap", "dbl-tap", "hold"] as const,
      },
    },
    "media:mute": {
      frontend: mediaMuteFrontend,
      service: {
        ...mediaMuteBackend,
        gestureHandlers: ["tap"] as const,
      },
    },
    "media:volume:up": {
      frontend: volumeUpFrontend,
      service: {
        ...volumeUpBackend,
        gestureHandlers: ["tap"] as const,
      },
    },
    "media:volume:down": {
      frontend: volumeDownFrontend,
      service: {
        ...volumeDownBackend,
        gestureHandlers: ["tap"] as const,
      },
    },
  },
  globalService,
  // ponytail: addon-level OS checks (playerctl/wpctl/osascript/powershell)
  // are built at the Node edge by check-runner, not here. This manifest
  // is bundled into the frontend vite graph; importing node:child_process
  // here would externalize it for the browser and break the SPA on load.
}

export default manifest
