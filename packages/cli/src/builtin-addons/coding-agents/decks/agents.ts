import type { AddonDeckEntryCtx, AddonGeneratedDeck } from "../types/types.js"

// ponytail: decks are materialized ONCE from createDecks, so tiles can't
// follow sessions live. Fixed slot tiles resolve which agent each shows from
// the latest snapshot (see agentAtSlot in shared/snapshot.ts) — active /
// attention sessions float to the lowest slots, idle history fills the rest.
export const createAgentsDecks = (
  ctx: AddonDeckEntryCtx,
): Record<string, AddonGeneratedDeck> => {
  const keyCount = ctx.keyCount ?? 15
  const agentSlots = Math.max(0, keyCount - 1)
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
