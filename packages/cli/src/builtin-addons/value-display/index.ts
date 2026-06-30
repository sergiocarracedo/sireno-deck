import type { NewAddonManifest } from "@/addon/api";

import manifestJson from "./sirenodeck.json" with { type: "json" };

import valueDisplayBackend from "./buttons/value-display/backend";
import valueDisplayFrontend from "./buttons/value-display/frontend";

export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: manifestJson.name,
  buttonTypes: {
    "core:value-display": {
      frontend: valueDisplayFrontend,
      backend: valueDisplayBackend,
    },
  },
  publishIntervalMs: 5000,
};

export const valueDisplayAddon = manifest;
export default manifest;