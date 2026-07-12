import type { AddonButtonTypeService } from "@/addon/api"

import { configSchema } from "./config"

export default {
  configSchema,
  onTap: ({ publish }) => {
    publish("runtime:navigate-deck", {
      deckId: "emoji-selector:emoji-selector",
      addToHistory: true,
    })
  },
} satisfies AddonButtonTypeService
