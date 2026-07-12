import type { AddonButtonTypeService } from "@/addon/api"

import { configSchema } from "./config"

export default {
  configSchema,
  defaultRenderIntervalMs: 60000,
  gestureHandlers: ["tap"] as const,
  onTap: ({ config, publish }) => {
    const target = (config as { target_deck?: string }).target_deck
    if (target === undefined) return
    publish("runtime:navigate-deck", { deckId: target, addToHistory: true })
  },
} satisfies AddonButtonTypeService