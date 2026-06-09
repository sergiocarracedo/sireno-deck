import { ButtonInstance, DeckConfig, SirenoConfig } from '@/core/schemas'
import { HostContext } from '@/system/host-context'
import { DeckRuntimeOptions } from '../runtime'
import {
  getSystemBackButtonInstance,
  shouldInjectSystemBack,
} from '../system-back-injection'

const OVERLAY_TOGGLE_TYPE = 'oveerlay-toggle'

export const getLastPositionSystemButton = (
  lastPosition: number,
  deck: DeckConfig,
  overlayDeckId: string | null,
  // TODO remove this
  options: DeckRuntimeOptions,
  IMPLICIT_LOCKED_DECK_ID: string,
  hostContext: HostContext,
) => {
  // Overlay button
  if (overlayDeckId !== null && overlayDeckId === deck.id) {
    return {
      config: {},
      id: 'overlay-toggle',
      position: lastPosition,
      type: OVERLAY_TOGGLE_TYPE,
    } as unknown as ButtonInstance
  }

  // Settings button

  // Back button
  const syntheticConfig = {
    ...(options.config ?? {}),
    session: {
      ...(options.config?.session ?? {}),
      locked_deck: options.lockedDeckId ?? IMPLICIT_LOCKED_DECK_ID,
    },
  } as SirenoConfig

  return shouldInjectSystemBack(
    deck,
    syntheticConfig,
    hostContext.session.state,
  )
    ? getSystemBackButtonInstance(deck, lastPosition)
    : null
}
