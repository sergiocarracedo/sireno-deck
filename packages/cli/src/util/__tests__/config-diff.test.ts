import { describe, expect, it } from "vitest"

import type { RawConfig } from "@/config/schemas"
import { configChanged, onlyDecksChanged } from "../config-diff"

const base = (): RawConfig =>
  ({
    decks: {
      main: {
        buttons: [{ type: "core:change-deck", config: { deck: "x" } }],
      },
    },
  }) as unknown as RawConfig

const mutateDecks = (cfg: RawConfig): void => {
  ;(cfg.decks.main!.buttons[0] as { config?: unknown }).config = { deck: "y" }
}

describe("onlyDecksChanged", () => {
  it("returns true when only decks changed", () => {
    const prev = base()
    const next = base()
    mutateDecks(next)
    expect(onlyDecksChanged(prev, next)).toBe(true)
  })

  it("returns false when decks + theme changed", () => {
    const prev = base()
    const next = base()
    ;(next as { theme?: unknown }).theme = "dark"
    mutateDecks(next)
    expect(onlyDecksChanged(prev, next)).toBe(false)
  })

  it("returns false when decks + addons changed", () => {
    const prev = base()
    const next = base()
    ;(next as { addons?: unknown }).addons = ["a"]
    mutateDecks(next)
    expect(onlyDecksChanged(prev, next)).toBe(false)
  })

  it("returns false when only addons changed", () => {
    const prev = base()
    const next = base()
    ;(next as { addons?: unknown }).addons = ["a"]
    expect(onlyDecksChanged(prev, next)).toBe(false)
  })

  it("returns false when identical", () => {
    const prev = base()
    const next = base()
    expect(onlyDecksChanged(prev, next)).toBe(false)
  })

  it("returns false when top-level key count differs", () => {
    const prev = base()
    const next = base()
    mutateDecks(next)
    ;(next as { theme?: unknown }).theme = "dark"
    expect(onlyDecksChanged(prev, next)).toBe(false)
  })

  it("returns true when deck is added without other top-level changes", () => {
    const prev = base()
    const next = base()
    ;(next.decks as Record<string, unknown>)["other"] = { buttons: [] }
    expect(onlyDecksChanged(prev, next)).toBe(true)
  })

  it("detects deck metadata, trigger, and pagination changes", () => {
    const prev = base()
    const next = base()
    next.decks.main = {
      ...next.decks.main!,
      name: "Renamed",
      paginated: true,
      trigger: { process_name: "editor" },
    }
    expect(onlyDecksChanged(prev, next)).toBe(true)
  })

  it("detects theme and addon changes independently of decks", () => {
    const prev = base()
    const next = base()
    ;(next as { theme?: unknown }).theme = "dark"
    ;(next as { addons?: unknown }).addons = ["addon"]
    expect(configChanged(prev, next)).toBe(true)
  })
})
