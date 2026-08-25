import { z } from "zod"
import type { AddonButtonTypeService } from "@/addon/api"

import { configSchema } from "./config"

type Config = z.infer<typeof configSchema>

export default {
  configSchema,
  onTap: ({ config, publish, buttonId, position }) => {
    publish("runtime:navigate-deck", {
      deckId: config.deck,
      addToHistory: config.addToHistory ?? true,
      buttonId,
      position,
    })
  },
} satisfies AddonButtonTypeService<Config>
