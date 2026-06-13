import { ButtonInstance, DeckConfig, SirenoConfig } from '@/core/schemas'
import type { HostContext } from '@/system/host-context'
import {
  getSystemBackButtonInstance,
  shouldInjectSystemBack,
} from '../system-back-injection'

export const OVERLAY_TOGGLE_TYPE = 'overlay-toggle' as const
export const SYSTEM_SETTINGS_TYPE = 'system-settings' as const
export const SYSTEM_BACK_WITH_PENDING_OVERLAY_TYPE =
  'system-back-with-pending-overlay' as const

export interface SystemButtonContext {
  activeOwnerName: string | null
  config: SirenoConfig
  hostContext: HostContext
  internalLockedDeckId: string
  mainDeckId: string
  overlayDeckId: string | null
  pendingOverlayDeckId: string | null
  runtimeDecks: Readonly<Record<string, DeckConfig>>
}

function isOverlayOrPageOf(
  deckId: string,
  overlayDeckId: string,
): boolean {
  return deckId === overlayDeckId || deckId.startsWith(`${overlayDeckId}-p`)
}

export function getLastPositionSystemButton(
  lastPosition: number,
  deck: DeckConfig,
  ctx: SystemButtonContext,
): ButtonInstance | null {
  if (ctx.overlayDeckId !== null && isOverlayOrPageOf(deck.id, ctx.overlayDeckId)) {
    return {
      config: {},
      id: OVERLAY_TOGGLE_TYPE,
      position: lastPosition,
      type: OVERLAY_TOGGLE_TYPE,
    } as unknown as ButtonInstance
  }

  if (deck.id === ctx.mainDeckId && 'settings' in ctx.runtimeDecks) {
    return {
      config: {},
      id: SYSTEM_SETTINGS_TYPE,
      position: lastPosition,
      type: SYSTEM_SETTINGS_TYPE,
    } as unknown as ButtonInstance
  }

  if (
    ctx.pendingOverlayDeckId !== null &&
    ctx.pendingOverlayDeckId !== ctx.overlayDeckId
  ) {
    return {
      config: {
        pendingOverlayDeck: ctx.runtimeDecks[ctx.pendingOverlayDeckId],
      },
      id: SYSTEM_BACK_WITH_PENDING_OVERLAY_TYPE,
      position: lastPosition,
      type: SYSTEM_BACK_WITH_PENDING_OVERLAY_TYPE,
    } as unknown as ButtonInstance
  }

  return shouldInjectSystemBack(
    deck,
    ctx.config,
    ctx.hostContext.session.state,
  )
    ? getSystemBackButtonInstance(deck, lastPosition)
    : null
}
