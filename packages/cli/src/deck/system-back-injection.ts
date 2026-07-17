import type { SystemButtonType } from "./system-buttons/types"

export interface RuntimeDeck {
  id: string
  name: string
  buttons: ReadonlyArray<{ id: string; type: string; position?: number; config?: unknown }>
  isMain?: boolean
  isOverlay?: boolean
  processNames?: ReadonlyArray<string>
  windowNames?: ReadonlyArray<string>
  autoShow?: boolean
  icon?: string
}

export interface RuntimeState {
  navStackDepth: number
  hasOverlayDeckAvailable: boolean
}

export const computeSystemButtonForSlotN1 = (
  deck: RuntimeDeck,
  _state: RuntimeState,
): SystemButtonType | null => {
  if (deck.isMain) return "core:settings-entry"
  return "core:back"
}

export const injectSystemButtons = <T extends RuntimeDeck>(
  decks: ReadonlyArray<T>,
  keyCount: number,
): ReadonlyArray<T> => {
  const n1Position = keyCount - 1
  return decks.map((deck) => {
    const systemButtonType = computeSystemButtonForSlotN1(deck, {
      navStackDepth: 1,
      hasOverlayDeckAvailable: false,
    })
    if (systemButtonType === null) return deck
    const filtered = deck.buttons.filter((b) => {
      const parsed = Number.parseInt(b.id, 10)
      return parsed !== n1Position && b.position !== n1Position
    })
    return {
      ...deck,
      buttons: [
        ...filtered,
        { id: String(n1Position), type: systemButtonType } as T["buttons"][number],
      ],
    }
  })
}