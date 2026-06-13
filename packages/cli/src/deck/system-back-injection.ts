import type { ButtonInstance, DeckConfig, SirenoConfig } from '@/core/schemas'
import type { HostSessionState } from '@/system/host-context'

export const SYSTEM_BACK_TYPE = 'system-back' as const

export function shouldInjectSystemBack(
  deck: DeckConfig,
  config: SirenoConfig,
  sessionState: HostSessionState,
): boolean {
  if (config.allow_reserved_slot_override === true) return false
  if (deck.allow_reserved_slot_override === true) return false

  if (
    sessionState === 'locked' &&
    config.session?.locked_deck !== undefined &&
    config.session.locked_deck === deck.id
  ) {
    return false
  }

  const reservedPosition = Math.max(0, (deck.keyCount ?? 15) - 1)
  if (deck.buttons.some((btn) => btn.position === reservedPosition)) {
    return false
  }

  return true
}

export function getSystemBackButtonInstance(
  deck: DeckConfig,
  keyIndex: number,
): ButtonInstance {
  return {
    id: 'system-back',
    position: keyIndex,
    type: SYSTEM_BACK_TYPE,
  } as unknown as ButtonInstance
}
