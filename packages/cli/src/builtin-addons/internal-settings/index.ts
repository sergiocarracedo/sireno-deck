import { z } from "zod";

import type { SirenoAddon } from "@/addon/api-types.ts";
import type { AddonDeckDefinition } from "@/addon/api.ts";

import { coreSettingsAboutButton } from "./about.ts";
import { coreSettingsBrightnessButton } from "./brightness.ts";
import { coreSettingsThemeButton } from "./theme.ts";

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

export { coreSettingsBrightnessButton } from "./brightness.ts";
export { coreSettingsThemeButton } from "./theme.ts";
export { coreSettingsAboutButton } from "./about.ts";
export { settingsDeckDef };
