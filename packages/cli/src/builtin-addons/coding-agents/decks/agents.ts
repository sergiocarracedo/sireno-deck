import type { AddonDeckEntryCtx, AddonGeneratedDeck } from "../types/types.js"

export const createAgentsDecks = (
  _ctx: AddonDeckEntryCtx,
): Record<string, AddonGeneratedDeck> => {
  // ponytail: decks are materialized ONCE from createDecks — there is no
  // per-broadcast refill pass yet, so per-agent tiles can't be listed
  // dynamically. Until that machinery exists, ship a single info tile so
  // this deck reads as intentional instead of an empty grid. The summary
  // button on main carries the live instance/attention count.
  return {
    "coding-agents:agents": {
      name: "Coding agents",
      icon: "addon://coding-agents/assets/opencode-dark-square.svg",
      buttons: [
        {
          position: 0,
          type: "core:action",
          config: {
            icon: "icon://bot",
            label: "See summary",
          },
        },
        {
          position: 1,
          type: "core:action",
          config: {
            icon: "icon://info",
            label: "Per-agent view coming soon",
          },
        },
      ],
    },
  }
}
