import type { AddonRegistry } from "@/addon/registry.ts";

import { registerBuiltInThemes } from "@/themes/index.ts";

import { coreButtonsAddon } from "./core-buttons/index.ts";
import { internalSettingsAddon } from "./internal-settings/index.ts";
import { sessionAddon } from "./session/index.ts";

export const registerBuiltins = (registry: AddonRegistry): void => {
  registerBuiltInThemes(registry);
  registry.load(coreButtonsAddon);
  registry.load(internalSettingsAddon);
  registry.load(sessionAddon);
};
