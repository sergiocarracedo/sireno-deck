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
  // ponytail: only materialize tiles for live sessions (capped by MAX_PAGES
  // worth of slots) — trailing slots stay unoccupied so the frontend draws a
  // faint empty-key outline instead of a themed background behind blank content.
  const cappedLive = Math.min(live, pages * pageSize)

  const tile = (slot: number): Record<string, unknown> => ({
    position: slot % pageSize,
    type: "coding-agents:agent",
    // `slot` is the index into the full sorted agent list, not the position on
    // this page — buttons/agent resolves it against the whole snapshot.
    config: { slot },
  })

  if (pages === 1) {
    // Keep one addon tile mounted while empty so its channel stays active and
    // a newly started instance can trigger the next deck rebuild.
    const materializedSlots = Math.max(1, cappedLive)
    const buttons: Array<Record<string, unknown>> = []
    for (let slot = 0; slot < materializedSlots; slot += 1)
      buttons.push(tile(slot))
    return {
      [AGENTS_DECK_BASE]: {
        name: "Coding agents",
        icon: "icon://bot",
        buttons,
      },
    }
  }

  // ponytail: setPageCount() above has always named pages `base-pN`, and
  // deckTarget() sends the summary button to `-p1` as soon as there is more
  // than one page — but only the base deck was ever generated, so past
  // (keyCount - 2) agents the summary button navigated to a deck that did not
  // exist. Materialize the pages it promises.
  const decks: Record<string, AddonGeneratedDeck> = {}
  for (let page = 0; page < pages; page += 1) {
    const first = page * pageSize
    const last = Math.min(cappedLive, first + pageSize)
    const buttons: Array<Record<string, unknown>> = []
    for (let slot = first; slot < last; slot += 1) buttons.push(tile(slot))
    decks[`${AGENTS_DECK_BASE}-p${page + 1}`] = {
      name: pages > 1 ? `Coding agents ${page + 1}/${pages}` : "Coding agents",
      icon: "icon://bot",
      buttons,
    }
  }
  return decks
}
