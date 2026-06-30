import type { NewAddonManifest } from "@/addon/api";

import manifestJson from "./sirenodeck.json" with { type: "json" };

import mediaMuteBackend from "./buttons/media-mute/backend";
import mediaMuteFrontend from "./buttons/media-mute/frontend";
import mediaPlayerBackend from "./buttons/media-player/backend";
import mediaPlayerFrontend from "./buttons/media-player/frontend";
import mediaVolumeBackend from "./buttons/media-volume/backend";
import mediaVolumeFrontend from "./buttons/media-volume/frontend";

export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: manifestJson.name,
  buttonTypes: {
    "media-player:player": {
      frontend: mediaPlayerFrontend,
      backend: mediaPlayerBackend,
    },
    "media-player:mute": {
      frontend: mediaMuteFrontend,
      backend: mediaMuteBackend,
    },
    "media-player:volume": {
      frontend: mediaVolumeFrontend,
      backend: mediaVolumeBackend,
    },
  },
  publishIntervalMs: 2000,
};

export const mediaPlayerAddon = manifest;
export default manifest;