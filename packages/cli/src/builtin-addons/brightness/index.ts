import type { NewAddonManifest } from "@/addon/api";

import manifestJson from "./sirenodeck.json" with { type: "json" };

import brightnessBackend from "./buttons/brightness/backend";
import brightnessFrontend from "./buttons/brightness/frontend";

export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: manifestJson.name,
  buttonTypes: {
    "brightness:brightness": {
      frontend: brightnessFrontend,
      backend: brightnessBackend,
    },
  },
  publishIntervalMs: 2000,
};

export const brightnessAddon = manifest;
export default manifest;
export { brightnessBackend, brightnessFrontend };