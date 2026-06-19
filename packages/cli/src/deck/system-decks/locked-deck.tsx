import datetimeButtonsAddon from '@/builtin-addons/date-time'
import { DeckConfig } from '@/core/schemas'
import { INTERNAL_LOCKED_DECK_ID } from './consts'

export const lockedTimeTileButtonDefinition = datetimeButtonsAddon.buttons.find(
  (button) => button.type === 'locked-time-tile',
)

function createInternalLockedDeck(keyCount: number): DeckConfig {
  const centerStart = Math.floor(keyCount / 2) - 1
  return {
    id: INTERNAL_LOCKED_DECK_ID,
    name: 'Locked Session',
    system: true,
    buttons: (['hour', 'separator', 'minute'] as const).map((slot, index) => ({
      config: { slot },
      definition: lockedTimeTileButtonDefinition,
      full: true,
      position: centerStart + index,
      type: 'locked-time-tile',
    })),
  }
}

export { createInternalLockedDeck }
