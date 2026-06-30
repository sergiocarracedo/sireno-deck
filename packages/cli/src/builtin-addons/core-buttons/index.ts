import type { NewAddonManifest } from "@/addon/api";

import manifestJson from "./sirenodeck.json" with { type: "json" };

import actionBackend from "./buttons/action/backend";
import actionFrontend from "./buttons/action/frontend";
import changeDeckBackend from "./buttons/change-deck/backend";
import changeDeckFrontend from "./buttons/change-deck/frontend";
import mediaSampleBackend from "./buttons/media-sample/backend";
import mediaSampleFrontend from "./buttons/media-sample/frontend";
import toggleBackend from "./buttons/toggle/backend";
import toggleFrontend from "./buttons/toggle/frontend";

export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: manifestJson.name,
  buttonTypes: {
    "core:action": { frontend: actionFrontend, backend: actionBackend },
    "core:change-deck": { frontend: changeDeckFrontend, backend: changeDeckBackend },
    "core:toggle": { frontend: toggleFrontend, backend: toggleBackend },
    "core:media-sample": {
      frontend: mediaSampleFrontend,
      backend: mediaSampleBackend,
    },
  },
};

export const coreButtonsAddon = manifest;
export default manifest;
export {
  actionBackend as actionButtonBackend,
  actionFrontend as ActionButtonFrontend,
  changeDeckBackend as changeDeckButtonBackend,
  changeDeckFrontend as ChangeDeckButtonFrontend,
  toggleBackend as toggleButtonBackend,
  toggleFrontend as ToggleButtonFrontend,
  mediaSampleBackend as mediaSampleButtonBackend,
  mediaSampleFrontend as MediaSampleButtonFrontend,
};