import type { AddonManifestV1 } from "@/addon/api";

import valueDisplayBackend from "./buttons/value-display/backend";
import valueDisplayFrontend from "./buttons/value-display/frontend";

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "value-display",
  buttonTypes: {
    "value-display:display": {
      frontend: valueDisplayFrontend,
      backend: valueDisplayBackend,
    },
  },
  publishIntervalMs: 5000,
};

export const valueDisplayAddon = manifest;
export default manifest;