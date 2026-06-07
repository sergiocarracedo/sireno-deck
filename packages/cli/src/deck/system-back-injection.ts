import type {
  ButtonInstance,
  DeckConfig,
  SirenoConfig,
} from "@/core/schemas"

export const SYSTEM_BACK_TYPE = "system-back" as const

export function shouldInjectSystemBack(
  deck: DeckConfig,
  config: SirenoConfig,
): boolean {
  if (config.allow_reserved_slot_override) return false
  if (deck.allow_reserved_slot_override) return false
  if (config.session?.locked_deck === deck.id) return false
  if (
    deck.buttons?.some((b: { position?: number }) =>
      b.position === deck.keyCount - 1,
    )
  ) {
    return false
  }
  return true
}

export function getSystemBackButtonInstance(
  deck: DeckConfig,
  keyIndex: number,
): ButtonInstance {
  return {
    id: "system-back",
    position: keyIndex,
    type: SYSTEM_BACK_TYPE,
  } as unknown as ButtonInstance
}
