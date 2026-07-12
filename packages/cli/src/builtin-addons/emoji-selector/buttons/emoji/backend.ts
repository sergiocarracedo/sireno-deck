import type { AddonButtonTypeService } from "@/addon/api"

import { configSchema } from "./config"

export default {
  configSchema,
  gestureHandlers: ["tap"] as const,
  onTap: ({ config, publish }) => {
    const emoji = (config as { emoji?: string }).emoji
    if (emoji === undefined) return
    publish("runtime:dispatch", { value: `paste://${emoji}` })
  },
} satisfies AddonButtonTypeService
