import type { AddonRegistry } from "@/addon/registry.ts";

import { registerBuiltInThemes } from "@/themes/index.ts";

import { coreButtonsAddon } from "./core-buttons/index.ts";
import { dateTimeAddon } from "./date-time/index.ts";
import { internalSettingsAddon } from "./internal-settings/index.ts";
import { sessionAddon } from "./session/index.ts";
import { systemStatusAddon } from "./system-status/index.ts";
import { valueDisplayAddon } from "./value-display/index.ts";

export const registerBuiltins = (registry: AddonRegistry): void => {
  registerBuiltInThemes(registry);
  registry.load(coreButtonsAddon);
  registry.load(internalSettingsAddon);
  registry.load(sessionAddon);
  registry.load(dateTimeAddon);
  registry.load(systemStatusAddon);
  registry.load(valueDisplayAddon);
};