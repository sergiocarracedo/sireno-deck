import coreButtonsAddon from "../../../../builtin-addons/core-buttons/src/index.js"
import emojiSelectorAddon from "../../../../builtin-addons/emoji-selector/src/index.js"

import type { SirenoAddon } from "./api.js"

export function getBundledAddons(): readonly SirenoAddon[] {
  return [coreButtonsAddon, emojiSelectorAddon]
}
