import coreButtonsAddon from '../builtin-addons/core-buttons/index.js'
import datetimeButtonsAddon from '../builtin-addons/date-time/index.js'
import emojiSelectorAddon from '../builtin-addons/emoji-selector/index.js'

import type { SirenoAddon } from './api.js'

export function getBundledAddons(): readonly SirenoAddon[] {
  return [coreButtonsAddon, emojiSelectorAddon, datetimeButtonsAddon]
}
