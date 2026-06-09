import type { ButtonInstance, DeckConfig, SirenoConfig } from '@/core/schemas'
import type { HostSessionState } from '@/system/host-context'

export const SYSTEM_BACK_TYPE = 'system-back' as const

export function shouldInjectSystemBack(
  deck: DeckConfig,
  config: SirenoConfig,
  sessionState: HostSessionState,
): boolean {
  return deck.id !== 'main' && sessionState !== 'locked'
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
