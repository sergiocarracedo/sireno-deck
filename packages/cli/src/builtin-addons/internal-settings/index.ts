import type { AddonManifestV1 } from "@/addon/api";

import aboutBackend from "./buttons/about/backend";
import aboutFrontend from "./buttons/about/frontend";
import brightnessBackend from "./buttons/brightness/backend";
import brightnessFrontend from "./buttons/brightness/frontend";
import themeBackend from "./buttons/theme/backend";
import themeFrontend from "./buttons/theme/frontend";
import settingsDeck from "./decks/settings";

const withInternal = <T extends object>(impl: T): T & { internal: true } => ({
  ...impl,
  internal: true,
});

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "internal-settings",
  buttonTypes: {
    "internal-settings:about": {
      frontend: aboutFrontend,
      service: { ...withInternal(aboutBackend), gestureHandlers: ["tap"] as const },
    },
    "internal-settings:brightness": {
      frontend: brightnessFrontend,
      service: { ...withInternal(brightnessBackend), gestureHandlers: ["tap"] as const },
    },
    "internal-settings:theme": {
      frontend: themeFrontend,
      service: { ...withInternal(themeBackend), gestureHandlers: ["tap"] as const },
    },
  },
  decks: {
    "internal-settings:settings": { deck: settingsDeck, internal: true },
  },
};

export const internalSettingsAddon = manifest;
export default manifest;
