import { z } from "zod"
import type { AddonButtonTypeService } from "@/addon/api"

import { configSchema } from "./config"

type Config = z.infer<typeof configSchema>

export default {
  configSchema,
  onTap: async ({ config, methods }) => {
    const step = config.step ?? 5
    await (
      methods["internal-settings:brightnessDown"] as (
        s: number,
      ) => Promise<void>
    )?.(step)
  },
} satisfies AddonButtonTypeService<Config>
