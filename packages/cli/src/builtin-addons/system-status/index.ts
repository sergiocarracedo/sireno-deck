import type { NewAddonManifest } from "@/addon/api";

import manifestJson from "./sirenodeck.json" with { type: "json" };

import systemStatusBackend from "./buttons/system-status/backend";
import systemStatusFrontend from "./buttons/system-status/frontend";

export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: manifestJson.name,
  buttonTypes: {
    "system-status:status": {
      frontend: systemStatusFrontend,
      backend: systemStatusBackend,
    },
  },
  publishIntervalMs: 1000,
};

export const systemStatusAddon = manifest;
export default manifest;