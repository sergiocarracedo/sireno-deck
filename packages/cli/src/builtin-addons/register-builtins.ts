import type { AddonRegistry } from "@/addon/registry.ts";

import { registerBuiltInThemes } from "@/themes/loader.ts";

import brightnessAddon from "./brightness/index.ts";
import { coreButtonsAddon } from "./core-buttons/index.ts";
import dateTimeAddon from "./date-time/index.ts";
import emojiSelectorAddon from "./emoji-selector/index.tsx";
import { internalSettingsAddon } from "./internal-settings/index.ts";
import mediaPlayerAddon from "./media-player/index.ts";
import { sessionAddon } from "./session/index.ts";
import systemStatusAddon from "./system-status/index.ts";
import valueDisplayAddon from "./value-display/index.ts";
import weatherAddon from "./weather/index.ts";

export const registerBuiltins = (registry: AddonRegistry): void => {
  registerBuiltInThemes(registry);
  registry.load(coreButtonsAddon);
  registry.load(internalSettingsAddon);
  registry.load(sessionAddon);
  registry.load(dateTimeAddon);
  registry.load(emojiSelectorAddon);
  registry.load(mediaPlayerAddon);
  registry.load(systemStatusAddon);
  registry.load(valueDisplayAddon);
  registry.load(weatherAddon);
  registry.load(brightnessAddon);
};