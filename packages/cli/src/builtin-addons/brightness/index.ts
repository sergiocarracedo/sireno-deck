import type { NewAddonManifest } from "@/addon/api";

import { BrightnessButtonFrontend } from "./buttons/brightness.frontend";
import { brightnessButtonBackend } from "./buttons/brightness";

export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: "brightness",
  frontend: { main: "./index" },
  kind: "runtime",
  buttonTypes: {
    "core:brightness": {
      frontend: BrightnessButtonFrontend,
      backend: brightnessButtonBackend,
    },
  },
  publishIntervalMs: 2000,
};

export const brightnessAddon = manifest;
export default brightnessAddon;
export const BrightnessButtonBackend = brightnessButtonBackend;
export const BrightnessButtonSchema = brightnessButtonBackend.configSchema;
export type { BrightnessButtonConfig } from "./buttons/brightness";
export { buildMacOSCommand, formatCommand, isMacOS, setBrightnessMacOS } from "./domain/macos";
