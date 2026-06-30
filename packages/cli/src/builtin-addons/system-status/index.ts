import type { NewAddonManifest } from "@/addon/api";

import { SystemStatusButtonFrontend, systemStatusButtonBackend } from "./buttons/system-status";
export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: "system-status",
  frontend: { main: "./index" },
  buttonTypes: {
    "core:system-status": {
      frontend: SystemStatusButtonFrontend,
      backend: systemStatusButtonBackend,
    },
  },
  publishIntervalMs: 1000,
};

export const systemStatusAddon = manifest;
export default systemStatusAddon;
export const SystemStatusButtonBackend = systemStatusButtonBackend;
export type { CanonicalSystemMetricSnapshot, SystemStatusButtonConfig } from "./buttons/system-status";
