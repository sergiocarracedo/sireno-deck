import type { RawButtonEntry, RawConfig, RawDeckDef } from "./schemas"

const buttonKey = (entry: RawButtonEntry, idx: number): string => {
  if (typeof entry === "string") return `s:${idx}:${entry}`
  return `o:${idx}:${JSON.stringify(entry)}`
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
    if (!sameButtons(prevDeck, nextDeck)) return true
  }
  return false
}
