import type { AddonDeckEntryCtx, AddonGeneratedDeck } from "../types/types"

export const createAgentsDecks = (
  _ctx: AddonDeckEntryCtx,
): Record<string, AddonGeneratedDeck> => {
  // ponytail: the deck is rebuilt every broadcast from the runtime's
  // current snapshot. We expose a static deck shape here so the runtime
  // knows which addon owns it; the snapshot is read by the runtime's
  // deck-config resolver at broadcast time, not at deck-creation time.
  return {
    "coding-agents:agents": {
      name: "Coding agents",
      icon: "addon://coding-agents/assets/opencode-dark-square.svg",
      paginated: true,
      buttons: [],
    },
  }
}
