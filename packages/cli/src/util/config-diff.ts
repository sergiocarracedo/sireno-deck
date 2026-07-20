import type { RawConfig } from "@/config/schemas"

export const onlyDecksChanged = (
  prev: RawConfig,
  next: RawConfig,
): boolean => {
  const prevKeys = Object.keys(prev)
  const nextKeys = Object.keys(next)
  if (prevKeys.length !== nextKeys.length) return false
  const prevSet = new Set(prevKeys)
  for (const k of nextKeys) if (!prevSet.has(k)) return false
  for (const k of prevKeys) {
    if (k === "decks") continue
    if (JSON.stringify(prev[k]) !== JSON.stringify(next[k])) return false
  }
  if (JSON.stringify(prev.decks) === JSON.stringify(next.decks)) return false
  return true
}
