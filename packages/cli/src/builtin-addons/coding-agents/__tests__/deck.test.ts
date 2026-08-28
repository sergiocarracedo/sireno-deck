import { describe, expect, it } from "vitest"

import { AGENTS_FIRST_PAGE, createAgentsDecks } from "../decks/agents"

describe("createAgentsDecks", () => {
  it("generates enough slot tiles to paginate (pageSize = keyCount-2)", () => {
    const decks = createAgentsDecks({
      config: {},
      deck: { id: "coding-agents:agents" },
      keyCount: 15,
    })
    const deck = decks["coding-agents:agents"]!
    const agentSlots = (deck.buttons ?? []).filter(
      (b) => (b as { type?: string }).type === "coding-agents:agent",
    )
    // 3 pages worth; each page holds keyCount-2 agents (n-1 sys, n-2 page-nav)
    expect(agentSlots.length).toBe(3 * (15 - 2))
  })

  it("first page id matches the summary navigation target", () => {
    expect(AGENTS_FIRST_PAGE).toBe("coding-agents:agents-p1")
  })
})
