import type { RawConfig } from "@/config/schemas"
import {
  configChanged as allConfigChanged,
  decksChanged,
} from "@/config/config-diff"

export const onlyDecksChanged = (prev: RawConfig, next: RawConfig): boolean => {
  return (
    decksChanged(prev, next) &&
    JSON.stringify({ ...prev, decks: undefined }) ===
      JSON.stringify({ ...next, decks: undefined })
  )
}

export const configChanged = (prev: RawConfig, next: RawConfig): boolean =>
  allConfigChanged(prev, next)
