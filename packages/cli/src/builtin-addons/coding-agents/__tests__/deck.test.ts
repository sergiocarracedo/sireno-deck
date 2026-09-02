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

  it("materializes a single page with only the live sessions", () => {
    setLiveCount(2)
    setPageCount(1)
    const deck = createAgentsDecks(ctx(15))[AGENTS_DECK_BASE]!
    const agentSlots = (deck.buttons ?? []).filter(
      (b) => (b as { type?: string }).type === "coding-agents:agent",
    )
    // only live sessions are materialized; empty keys come from the frontend
    expect(agentSlots.length).toBe(2)
  })

  it("materializes more than a page worth of buttons past the page size", () => {
    setLiveCount(20)
    const deck = createAgentsDecks(ctx(15))[AGENTS_DECK_BASE]!
    const agentSlots = (deck.buttons ?? []).filter(
      (b) => (b as { type?: string }).type === "coding-agents:agent",
    )
    // 20 sessions across 2 pages
    expect(agentSlots.length).toBe(20)
  })

  it("keeps one placeholder tile when no sessions are live", () => {
    setLiveCount(0)
    const deck = createAgentsDecks(ctx(15))[AGENTS_DECK_BASE]!
    const agentSlots = (deck.buttons ?? []).filter(
      (b) => (b as { type?: string }).type === "coding-agents:agent",
    )
    expect(agentSlots.length).toBe(1)
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
