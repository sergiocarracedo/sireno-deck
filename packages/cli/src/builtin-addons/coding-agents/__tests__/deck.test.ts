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

  it("splits past the page size into the pages deckTarget promises", () => {
    // ponytail: setPageCount() has always named pages `base-pN` and deckTarget()
    // sends the summary button to `-p1` as soon as there is more than one page,
    // but only the base deck was ever generated — so past (keyCount - 2) agents
    // the button navigated to a deck that did not exist. The old test missed it
    // by only ever looking at the base deck.
    setLiveCount(20)
    const decks = createAgentsDecks(ctx(15))
    expect(Object.keys(decks).sort()).toEqual([
      `${AGENTS_DECK_BASE}-p1`,
      `${AGENTS_DECK_BASE}-p2`,
    ])
    const slots = Object.values(decks).flatMap((d) =>
      (d.buttons ?? []).filter(
        (b) => (b as { type?: string }).type === "coding-agents:agent",
      ),
    )
    expect(slots.length).toBe(20)
  })

  it("navigates somewhere that exists, at every size", () => {
    // The invariant the missing pages broke.
    for (const live of [0, 1, 5, 13, 14, 20, 78, 500]) {
      setLiveCount(live)
      const decks = createAgentsDecks(ctx(15))
      expect(
        Object.keys(decks),
        `live=${live} -> ${deckTarget()} missing from ${Object.keys(decks).join(", ")}`,
      ).toContain(deckTarget())
    }
  })

  it("keeps each page within the device key count", () => {
    setLiveCount(40)
    for (const deck of Object.values(createAgentsDecks(ctx(15)))) {
      const positions = (deck.buttons ?? []).map(
        (b) => (b as { position: number }).position,
      )
      expect(Math.max(...positions)).toBeLessThan(15)
      // positions must be unique within a page, or tiles overwrite each other
      expect(new Set(positions).size).toBe(positions.length)
    }
  })

  it("gives every tile a distinct slot across pages", () => {
    setLiveCount(20)
    const slots = Object.values(createAgentsDecks(ctx(15)))
      .flatMap((d) => d.buttons ?? [])
      .map((b) => (b as { config: { slot: number } }).config.slot)
      .sort((a, b) => a - b)
    expect(slots).toEqual([...Array(20).keys()])
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
    const decks = createAgentsDecks(ctx(15))
    expect(Object.keys(decks).length).toBeLessThanOrEqual(6)
    const agentSlots = Object.values(decks).flatMap((d) =>
      (d.buttons ?? []).filter(
        (b) => (b as { type?: string }).type === "coding-agents:agent",
      ),
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
