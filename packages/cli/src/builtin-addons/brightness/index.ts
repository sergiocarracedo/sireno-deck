import type { AddonManifestV1 } from "@/addon/api";

import brightnessBackend from "./buttons/brightness/backend";
import brightnessFrontend from "./buttons/brightness/frontend";

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "brightness",
  buttonTypes: {
    "brightness:brightness": {
      frontend: brightnessFrontend,
      service: { ...brightnessBackend, gestureHandlers: ["tap"] as const },
    },
  },
  publishIntervalMs: 2000,
};

export const brightnessAddon = manifest;
export default manifest;
export { brightnessBackend, brightnessFrontend };
