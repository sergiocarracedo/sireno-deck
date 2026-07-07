import type { AddonManifestV1 } from "@/addon/api";

import { globalBackend } from "./backend";
import mediaPlayerBackend from "./buttons/media-player/backend";
import mediaPlayerFrontend from "./buttons/media-player/frontend";
import mediaMuteBackend from "./buttons/volume/mute/backend";
import mediaMuteFrontend from "./buttons/volume/mute/frontend";
import volumeDownBackend from "./buttons/volume/volume-down/backend";
import volumeDownFrontend from "./buttons/volume/volume-down/frontend";
import volumeUpBackend from "./buttons/volume/volume-up/backend";
import volumeUpFrontend from "./buttons/volume/volume-up/frontend";

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "media",
  buttonTypes: {
    "media:player": {
      frontend: mediaPlayerFrontend,
      backend: mediaPlayerBackend,
      gestureHandlers: ["tap"],
    },
    "media:mute": {
      frontend: mediaMuteFrontend,
      backend: mediaMuteBackend,
      gestureHandlers: ["tap"],
    },
    "media:volume:up": {
      frontend: volumeUpFrontend,
      backend: volumeUpBackend,
      gestureHandlers: ["tap"],
    },
    "media:volume:down": {
      frontend: volumeDownFrontend,
      backend: volumeDownBackend,
      gestureHandlers: ["tap"],
    },
  },
  globalBackend,
};

export default manifest;
