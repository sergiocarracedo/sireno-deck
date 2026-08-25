/** @vitest-environment node */
import { describe, expect, it } from "vitest"

import { buildDeckConfigMessage } from "../deck-config"

describe("buildDeckConfigMessage — deriveLabel for core:action", () => {
  const makeDeck = (config: Record<string, unknown>) => ({
    id: "test-deck",
    name: "Test Deck",
    buttons: [{ id: "0", type: "core:action", config }],
  })

  it("uses config.command when present (legacy behavior)", () => {
    const deck = makeDeck({ command: "ls -la" })
    const msg = buildDeckConfigMessage(
      deck,
      new Map(),
      {},
      undefined,
      15,
      false,
      () => undefined,
    )
    expect(msg.surfaces[deck.id]!.buttons[0]!.label).toBe("ls -la")
  })

  it("falls back to config.label when command is missing (addon-deck buttons)", () => {
    const deck = makeDeck({ icon: "icon://plus", label: "New Tab" })
    const msg = buildDeckConfigMessage(
      deck,
      new Map(),
      {},
      undefined,
      15,
      false,
      () => undefined,
    )
    expect(msg.surfaces[deck.id]!.buttons[0]!.label).toBe("New Tab")
  })

  it("truncates long commands but uses full label", () => {
    const deckCmd = makeDeck({ command: "abcdefghijklmnopqrstuvwxyz" })
    const msgCmd = buildDeckConfigMessage(
      deckCmd,
      new Map(),
      {},
      undefined,
      15,
      false,
      () => undefined,
    )
    expect(msgCmd.surfaces[deckCmd.id]!.buttons[0]!.label).toBe(
      "abcdefghijklm…",
    )

    const deckLabel = makeDeck({ label: "abcdefghijklmnopqrstuvwxyz" })
    const msgLabel = buildDeckConfigMessage(
      deckLabel,
      new Map(),
      {},
      undefined,
      15,
      false,
      () => undefined,
    )
    expect(msgLabel.surfaces[deckLabel.id]!.buttons[0]!.label).toBe(
      "abcdefghijklmnopqrstuvwxyz",
    )
  })

  it("returns undefined label when neither command nor label is set", () => {
    const deck = makeDeck({ icon: "icon://plus" })
    const msg = buildDeckConfigMessage(
      deck,
      new Map(),
      {},
      undefined,
      15,
      false,
      () => undefined,
    )
    expect(msg.surfaces[deck.id]!.buttons[0]!.label).toBeUndefined()
  })
})
