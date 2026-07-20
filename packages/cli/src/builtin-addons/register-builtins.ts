import type { AddonRegistry } from "@/addon/registry"

import { registerBuiltInThemes } from "@/themes/loader"

import brightnessAddon from "./brightness/index"
import { coreAddon } from "./core/index"
import dateTimeAddon from "./date-time/index"
import emojiSelectorAddon from "./emoji-selector/index"
import { internalSettingsAddon } from "./internal-settings/index"
import mediaPlayerAddon from "./media/index"
import { sessionAddon } from "./session/index"
import { systemStatusAddon } from "./system-status/index"
import testBuildinAddon from "./test-buildin/index"
import valueDisplayAddon from "./value-display/index"
import weatherAddon from "./weather/index"

export const registerBuiltins = (registry: AddonRegistry): void => {
  registerBuiltInThemes(registry)
  registry.load(coreAddon)
  registry.load(internalSettingsAddon)
  registry.load(sessionAddon)
  registry.load(dateTimeAddon)
  registry.load(emojiSelectorAddon)
  registry.load(mediaPlayerAddon)
  registry.load(systemStatusAddon)
  registry.load(valueDisplayAddon)
  registry.load(weatherAddon)
  registry.load(brightnessAddon)
  registry.load(testBuildinAddon)
}
