import type { NewAddonManifest } from "@/addon/api";

import {
  MediaMuteButtonFrontend,
  MediaPlayerButtonFrontend,
  MediaVolumeButtonFrontend,
} from "./buttons/media-player.frontend";
import {
  mediaMuteButtonBackend,
  mediaPlayerButtonBackend,
  mediaVolumeButtonBackend,
} from "./buttons/media-player";

export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: "media-player",
  frontend: { main: "./index" },
  kind: "runtime",
  buttonTypes: {
    "core:media-player": {
      frontend: MediaPlayerButtonFrontend,
      backend: mediaPlayerButtonBackend,
    },
    "core:media-mute": {
      frontend: MediaMuteButtonFrontend,
      backend: mediaMuteButtonBackend,
    },
    "core:media-volume": {
      frontend: MediaVolumeButtonFrontend,
      backend: mediaVolumeButtonBackend,
    },
  },
  publishIntervalMs: 2000,
};

export const mediaPlayerAddon = manifest;
export default mediaPlayerAddon;
export const MediaPlayerButtonBackend = mediaPlayerButtonBackend;
export const MediaMuteButtonBackend = mediaMuteButtonBackend;
export const MediaVolumeButtonBackend = mediaVolumeButtonBackend;
export type { MediaPlayerButtonConfig, MediaMuteButtonConfig, MediaVolumeButtonConfig } from "./buttons/media-player";
