import type { AddonDeckEntryCtx, AddonGeneratedDeck } from "../types/types.js"

// ponytail: decks are materialized ONCE from createDecks, so tile count is
// fixed. Generate 3 pages worth of slot tiles (pageSize = keyCount-2); the
// runtime's paginateDeck splits them into `-p1/-p2/-p3` with a core:page-nav
// at n-2. Which agent fills a slot is resolved per broadcast from the latest
// snapshot (agentAtSlot). Trailing pages can sit empty when few sessions are
// live — dynamic page counts need per-broadcast deck refill machinery.
const PAGES_CAP = 3

export const createAgentsDecks = (
  ctx: AddonDeckEntryCtx,
): Record<string, AddonGeneratedDeck> => {
  const keyCount = ctx.keyCount ?? 15
  const pageSize = Math.max(1, keyCount - 2)
  const agentSlots = PAGES_CAP * pageSize
  const buttons: Array<Record<string, unknown>> = []
  for (let slot = 0; slot < agentSlots; slot += 1) {
    buttons.push({
      position: slot,
      type: "coding-agents:agent",
      config: { slot },
    })
  }
  return {
    "coding-agents:agents": {
      name: "Coding agents",
      icon: "addon://coding-agents/assets/opencode-dark-square.svg",
      buttons,
    },
  }
}

// ponytail: paginated decks materialize as `coding-agents:agents-p1…`; the
// base id is not a runtime deck. The summary button navigates here.
export const AGENTS_FIRST_PAGE = "coding-agents:agents-p1" as const
