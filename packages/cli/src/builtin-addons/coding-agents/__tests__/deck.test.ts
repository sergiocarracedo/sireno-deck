import { beforeEach, describe, expect, it } from "vitest"

import { createAgentsDecks } from "../decks/agents"
import {
  AGENTS_DECK_BASE,
  deckTarget,
  setLiveCount,
  setPageCount,
} from "../shared/live-count"

const ctx = (keyCount: number) => ({
  config: {},
  deck: { id: AGENTS_DECK_BASE },
  keyCount,
})

describe("createAgentsDecks", () => {
  beforeEach(() => {
    setLiveCount(0)
    setPageCount(1)
  })

  it("materializes a single page when few sessions are live", () => {
    setLiveCount(2)
    const deck = createAgentsDecks(ctx(15))[AGENTS_DECK_BASE]!
    const agentSlots = (deck.buttons ?? []).filter(
      (b) => (b as { type?: string }).type === "coding-agents:agent",
    )
    // one page worth (keyCount-2 slots), pagination only past the page size
    expect(agentSlots.length).toBe(15 - 2)
  })

  it("pads pages beyond the live count", () => {
    setLiveCount(20)
    const deck = createAgentsDecks(ctx(15))[AGENTS_DECK_BASE]!
    const agentSlots = (deck.buttons ?? []).filter(
      (b) => (b as { type?: string }).type === "coding-agents:agent",
    )
    // 20 sessions → 2 pages × (15-2) slots
    expect(agentSlots.length).toBe(2 * (15 - 2))
  })

  it("caps pages", () => {
    setLiveCount(500)
    const deck = createAgentsDecks(ctx(15))[AGENTS_DECK_BASE]!
    const agentSlots = (deck.buttons ?? []).filter(
      (b) => (b as { type?: string }).type === "coding-agents:agent",
    )
    expect(agentSlots.length).toBeLessThanOrEqual(6 * (15 - 2))
  })

  it("deckTarget points at -p1 when paginated, base id otherwise", () => {
    setPageCount(1)
    expect(deckTarget()).toBe(AGENTS_DECK_BASE)
    setPageCount(2)
    expect(deckTarget()).toBe(`${AGENTS_DECK_BASE}-p1`)
  })
})
