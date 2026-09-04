import type { RawButtonEntry, RawConfig, RawDeckDef } from "./schemas"

const buttonKey = (entry: RawButtonEntry, idx: number): string => {
  if (typeof entry === "string") return `s:${idx}:${entry}`
  return `o:${idx}:${JSON.stringify(entry)}`
}

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue)
  if (typeof value !== "object" || value === null) return value
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => [key, stableValue(entry)]),
  )
}

const sameButtons = (a: RawDeckDef, b: RawDeckDef): boolean => {
  if (a.buttons.length !== b.buttons.length) return false
  for (let i = 0; i < a.buttons.length; i += 1) {
    if (buttonKey(a.buttons[i]!, i) !== buttonKey(b.buttons[i]!, i)) {
      return false
    }
  }
  return true
}

export const decksChanged = (prev: RawConfig, next: RawConfig): boolean => {
  const prevKeys = Object.keys(prev.decks)
  const nextKeys = Object.keys(next.decks)
  if (prevKeys.length !== nextKeys.length) return true
  for (const id of prevKeys) {
    if (!Object.prototype.hasOwnProperty.call(next.decks, id)) return true
  }
  for (const id of nextKeys) {
    const prevDeck = prev.decks[id]
    const nextDeck = next.decks[id]
    if (prevDeck === undefined || nextDeck === undefined) return true
    if (
      JSON.stringify(stableValue(prevDeck)) !==
      JSON.stringify(stableValue(nextDeck))
    )
      return true
    if (!sameButtons(prevDeck, nextDeck)) return true
  }
  return false
}

/** Returns true for every config change that can affect runtime/editor state. */
export const configChanged = (prev: RawConfig, next: RawConfig): boolean =>
  JSON.stringify(stableValue(prev)) !== JSON.stringify(stableValue(next))

// Kept as the explicit old name used by the initial corrective tests.
export const onlyDecksChanged = decksChanged
