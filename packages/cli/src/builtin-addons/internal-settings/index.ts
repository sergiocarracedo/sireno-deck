import { z } from "zod";

import type { SirenoAddon } from "@/addon/api-types";
import type { AddonDeckDefinition } from "@/addon/api";

import { coreSettingsAboutButton } from "./about";
import { coreSettingsBrightnessButton } from "./brightness";
import { coreSettingsThemeButton } from "./theme";

const settingsDeckConfigSchema = z.object({});

const settingsDeckDef: AddonDeckDefinition = {
  type: "settings",
  configSchema: settingsDeckConfigSchema,
  createDecks: () => ({
    settings: {
      name: "Settings",
      buttons: [
        { id: "brightness", type: "core:settings-brightness", position: 0 },
        { id: "theme", type: "core:settings-theme", position: 1 },
        { id: "about", type: "core:settings-about", position: 2 },
      ],
    },
  }),
};

export const internalSettingsAddon: SirenoAddon = {
  apiVersion: 3,
  name: "internal-settings",
  buttons: [
    coreSettingsBrightnessButton,
    coreSettingsThemeButton,
    coreSettingsAboutButton,
  ] as never,
  decks: [settingsDeckDef],
};

export { coreSettingsBrightnessButton } from "./brightness";
export { coreSettingsThemeButton } from "./theme";
export { coreSettingsAboutButton } from "./about";
export { settingsDeckDef };
