import type { NewAddonManifest } from "@/addon/api";

import { ActionButtonFrontend, actionButtonBackend } from "./buttons/action";
import { ChangeDeckButtonFrontend, changeDeckButtonBackend } from "./buttons/change-deck";
import { MediaSampleButtonFrontend, mediaSampleButtonBackend } from "./buttons/media-sample";
import { ToggleButtonFrontend, toggleButtonBackend } from "./buttons/toggle";

export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: "core-buttons",
  frontend: { main: "./index" },
  buttonTypes: {
    "core:action": {
      frontend: ActionButtonFrontend,
      backend: actionButtonBackend,
    },
    "core:change-deck": {
      frontend: ChangeDeckButtonFrontend,
      backend: changeDeckButtonBackend,
    },
    "core:toggle": {
      frontend: ToggleButtonFrontend,
      backend: toggleButtonBackend,
    },
    "core:media-sample": {
      frontend: MediaSampleButtonFrontend,
      backend: mediaSampleButtonBackend,
    },
  },
};

export const coreButtonsAddon = manifest;
export default coreButtonsAddon;
export const ActionButtonBackend = actionButtonBackend;
export const ChangeDeckButtonBackend = changeDeckButtonBackend;
export const ToggleButtonBackend = toggleButtonBackend;
export const MediaSampleButtonBackend = mediaSampleButtonBackend;
