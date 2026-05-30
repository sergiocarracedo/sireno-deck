import coreButtonsAddon from '../builtin-addons/core-buttons'
import datetimeButtonsAddon from '../builtin-addons/date-time'
import emojiSelectorAddon from '../builtin-addons/emoji-selector'
import mediaPlayerAddon from '../builtin-addons/media-player'
import systemStatusAddon from '../builtin-addons/system-status'

import type { SirenoAddon } from './api.js'

export function getBundledAddons(): readonly SirenoAddon[] {
  return [
    coreButtonsAddon,
    emojiSelectorAddon,
    datetimeButtonsAddon,
    systemStatusAddon,
    mediaPlayerAddon,
  ]
}
