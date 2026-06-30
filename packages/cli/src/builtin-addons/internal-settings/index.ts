import type { NewAddonManifest } from "@/addon/api";

import manifestJson from "./sirenodeck.json" with { type: "json" };

import aboutBackend from "./buttons/about/backend";
import aboutFrontend from "./buttons/about/frontend";
import brightnessBackend from "./buttons/brightness/backend";
import brightnessFrontend from "./buttons/brightness/frontend";
import themeBackend from "./buttons/theme/backend";
import themeFrontend from "./buttons/theme/frontend";
import settingsDeck from "./decks/settings";

type JsonButton = (typeof manifestJson.buttons)[number];

const buildBackend = (
  impl: (typeof aboutBackend),
  json: JsonButton,
) => {
  if (json.internal !== true) return impl;
  return { ...impl, internal: true };
};

export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: manifestJson.name,
  buttonTypes: {
    "internal-settings:about": {
      frontend: aboutFrontend,
      backend: buildBackend(aboutBackend, manifestJson.buttons[0]!),
    },
    "internal-settings:brightness": {
      frontend: brightnessFrontend,
      backend: buildBackend(brightnessBackend, manifestJson.buttons[1]!),
    },
    "internal-settings:theme": {
      frontend: themeFrontend,
      backend: buildBackend(themeBackend, manifestJson.buttons[2]!),
    },
  },
  decks: {
    "internal-settings:settings": settingsDeck,
  },
};

export const internalSettingsAddon = manifest;
export default manifest;