import type { NewAddonManifest } from "@/addon/api";

import { AboutButtonFrontend } from "./buttons/about.frontend";
import { BrightnessButtonFrontend } from "./buttons/brightness.frontend";
import { ThemeButtonFrontend } from "./buttons/theme.frontend";
import { aboutButtonBackend } from "./buttons/about";
import { brightnessButtonBackend } from "./buttons/brightness";
import { themeButtonBackend } from "./buttons/theme";

export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: "internal-settings",
  frontend: { main: "./index" },
  buttonTypes: {
    "core:settings-brightness": {
      frontend: BrightnessButtonFrontend,
      backend: brightnessButtonBackend,
    },
    "core:settings-theme": {
      frontend: ThemeButtonFrontend,
      backend: themeButtonBackend,
    },
    "core:settings-about": {
      frontend: AboutButtonFrontend,
      backend: aboutButtonBackend,
    },
  },
  decks: {
    settings: () => ({
      name: "Settings",
      buttons: [
        { id: "brightness", type: "core:settings-brightness", position: 0 },
        { id: "theme", type: "core:settings-theme", position: 1 },
        { id: "about", type: "core:settings-about", position: 2 },
      ],
    }),
  },
};

export const internalSettingsAddon = manifest;
export default internalSettingsAddon;
export const AboutButtonBackend = aboutButtonBackend;
export const BrightnessButtonBackend = brightnessButtonBackend;
export const ThemeButtonBackend = themeButtonBackend;
