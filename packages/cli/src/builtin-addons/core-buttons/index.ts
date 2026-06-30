import type { NewAddonManifest } from "@/addon/api";

import { ActionButtonFrontend } from "./buttons/action.frontend";
import { ChangeDeckButtonFrontend } from "./buttons/change-deck.frontend";
import { MediaSampleButtonFrontend } from "./buttons/media-sample.frontend";
import { ToggleButtonFrontend } from "./buttons/toggle.frontend";
import { actionButtonBackend } from "./buttons/action";
import { changeDeckButtonBackend } from "./buttons/change-deck";
import { mediaSampleButtonBackend } from "./buttons/media-sample";
import { toggleButtonBackend } from "./buttons/toggle";

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
