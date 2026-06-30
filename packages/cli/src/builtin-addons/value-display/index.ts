import type { NewAddonManifest } from "@/addon/api";

import { ValueDisplayButtonFrontend, valueDisplayButtonBackend } from "./buttons/value-display";
export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: "value-display",
  frontend: { main: "./index" },
  kind: "runtime",
  buttonTypes: {
    "core:value-display": {
      frontend: ValueDisplayButtonFrontend,
      backend: valueDisplayButtonBackend,
    },
  },
  publishIntervalMs: 5000,
};

export const valueDisplayAddon = manifest;
export default valueDisplayAddon;
export const ValueDisplayButtonBackend = valueDisplayButtonBackend;
export type { ValueEntry, ValueDisplayButtonConfig } from "./buttons/value-display";
