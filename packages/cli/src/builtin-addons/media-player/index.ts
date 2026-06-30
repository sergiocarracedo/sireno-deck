import type { NewAddonManifest } from "@/addon/api";

import { MediaMuteButtonFrontend, mediaMuteButtonBackend } from "./buttons/media-mute";
import { MediaPlayerButtonFrontend, mediaPlayerButtonBackend } from "./buttons/media-player";
import { MediaVolumeButtonFrontend, mediaVolumeButtonBackend } from "./buttons/media-volume";
export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: "media-player",
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
export type {
  MediaPlayerButtonConfig,
  MediaMuteButtonConfig,
  MediaVolumeButtonConfig,
} from "./buttons/media-player";
