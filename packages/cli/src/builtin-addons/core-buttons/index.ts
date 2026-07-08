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
      service: { ...actionBackend, gestureHandlers: ["tap"] as const },
    },
    "core-buttons:change-deck": {
      frontend: changeDeckFrontend,
      service: { ...changeDeckBackend, gestureHandlers: ["tap"] as const },
    },
    "core-buttons:toggle": {
      frontend: toggleFrontend,
      service: { ...toggleBackend, gestureHandlers: ["tap"] as const },
    },
    "core-buttons:media-sample": {
      frontend: mediaSampleFrontend,
      service: { ...mediaSampleBackend, gestureHandlers: ["tap"] as const },
    },
  },
};

export const coreButtonsAddon = manifest;
export default manifest;
export {
  actionBackend as actionButtonBackend,
  actionFrontend as ActionButtonFrontend,
  changeDeckBackend as changeDeckButtonBackend,
  changeDeckFrontend as ChangeDeckFrontend,
  toggleBackend as toggleButtonBackend,
  toggleFrontend as ToggleFrontend,
  mediaSampleBackend as mediaSampleButtonBackend,
  mediaSampleFrontend as MediaSampleFrontend,
};
