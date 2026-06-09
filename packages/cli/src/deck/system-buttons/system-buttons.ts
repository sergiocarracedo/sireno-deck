import { ButtonInstance, DeckConfig, SirenoConfig } from '@/core/schemas'
import type { HostContext } from '@/system/host-context'
import {
  getSystemBackButtonInstance,
  shouldInjectSystemBack,
} from '../system-back-injection'

export const OVERLAY_TOGGLE_TYPE = 'overlay-toggle' as const
export const SYSTEM_SETTINGS_TYPE = 'system-settings' as const

export interface SystemButtonContext {
  config: SirenoConfig
  hostContext: HostContext
  internalLockedDeckId: string
  mainDeckId: string
  overlayDeckId: string | null
  runtimeDecks: Readonly<Record<string, DeckConfig>>
}

export function getLastPositionSystemButton(
  lastPosition: number,
  deck: DeckConfig,
  ctx: SystemButtonContext,
): ButtonInstance | null {
  if (ctx.overlayDeckId !== null && ctx.overlayDeckId === deck.id) {
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

  return shouldInjectSystemBack(
    deck,
    ctx.config,
    ctx.hostContext.session.state,
  )
    ? getSystemBackButtonInstance(deck, lastPosition)
    : null
}
