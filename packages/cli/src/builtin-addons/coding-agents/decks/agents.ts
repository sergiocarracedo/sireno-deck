import type { AddonDeckEntryCtx, AddonGeneratedDeck } from "../types/types.js"
import {
  AGENTS_DECK_BASE,
  getLiveCount,
  setPageCount,
} from "../shared/live-count.js"

// ponytail: decks are re-materialized on demand (see requestDeckRebuild) so
// the page count follows the live session count. One page up to
// (keyCount-2) sessions; pagination appears automatically beyond that.
// Cap pages to avoid pathological decks.
const MAX_PAGES = 6

export const createAgentsDecks = (
  ctx: AddonDeckEntryCtx,
): Record<string, AddonGeneratedDeck> => {
  const keyCount = ctx.keyCount ?? 15
  const pageSize = Math.max(1, keyCount - 2)
  const live = getLiveCount()
  const pages = Math.min(MAX_PAGES, Math.max(1, Math.ceil(live / pageSize)))
  setPageCount(pages)
  const agentSlots = pages * pageSize
  const buttons: Array<Record<string, unknown>> = []
  for (let slot = 0; slot < agentSlots; slot += 1) {
    buttons.push({
      position: slot,
      type: "coding-agents:agent",
      config: { slot },
    })
  }
  return {
    [AGENTS_DECK_BASE]: {
      name: "Coding agents",
      icon: "addon://coding-agents/assets/opencode-dark-square.svg",
      buttons,
    },
  }
}
