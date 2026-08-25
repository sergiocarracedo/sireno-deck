import { z } from "zod"
import type { AddonButtonTypeService } from "@/addon/api"

import { configSchema } from "./config"

type Config = z.infer<typeof configSchema>

export default {
  configSchema,
  onTap: ({ config, publish, buttonId, position }) => {
    const { nextDeckId } = config as Config
    publish("runtime:navigate-deck", {
      deckId: nextDeckId,
      addToHistory: false,
      buttonId,
      position,
    })
  },
  onHold: ({ config, publish, buttonId, position }) => {
    const { prevDeckId } = config as Config
    publish("runtime:navigate-deck", {
      deckId: prevDeckId,
      addToHistory: false,
      buttonId,
      position,
    })
  },
} satisfies AddonButtonTypeService<Config>
