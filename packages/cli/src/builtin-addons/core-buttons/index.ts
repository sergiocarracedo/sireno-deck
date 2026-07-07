import type { AddonManifestV1 } from "@/addon/api";

import actionBackend from "./buttons/action/backend";
import actionFrontend from "./buttons/action/frontend";
import changeDeckBackend from "./buttons/change-deck/backend";
import changeDeckFrontend from "./buttons/change-deck/frontend";
import mediaSampleBackend from "./buttons/media-sample/backend";
import mediaSampleFrontend from "./buttons/media-sample/frontend";
import toggleBackend from "./buttons/toggle/backend";
import toggleFrontend from "./buttons/toggle/frontend";

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "core-buttons",
  buttonTypes: {
    "core-buttons:action": {
      frontend: actionFrontend,
      backend: actionBackend,
      gestureHandlers: ["tap"],
    },
    "core-buttons:change-deck": {
      frontend: changeDeckFrontend,
      backend: changeDeckBackend,
      gestureHandlers: ["tap"],
    },
    "core-buttons:toggle": {
      frontend: toggleFrontend,
      backend: toggleBackend,
      gestureHandlers: ["tap"],
    },
    "core-buttons:media-sample": {
      frontend: mediaSampleFrontend,
      backend: mediaSampleBackend,
      gestureHandlers: ["tap"],
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
