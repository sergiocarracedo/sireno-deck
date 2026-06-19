import { DeckConfig } from '@/core/schemas'
import { INTERNAL_LOCKED_DECK_ID, INTERNAL_SETTINGS_DECK_ID } from './consts'
import { createInternalLockedDeck } from './locked-deck'
import { createInternalSettingsDeck } from './settings-deck'

export * from './consts'

export function createInternalDecks(
  keyCount: number,
): Record<string, DeckConfig> {
  return {
    [INTERNAL_LOCKED_DECK_ID]: createInternalLockedDeck(keyCount),
    [INTERNAL_SETTINGS_DECK_ID]: createInternalSettingsDeck(),
  }
}
