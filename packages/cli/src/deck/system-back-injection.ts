import type { SystemButtonType } from "./system-buttons/types"

export interface RuntimeDeck {
  id: string
  name: string
  buttons: ReadonlyArray<{ id: string; type: string; config?: unknown }>
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
