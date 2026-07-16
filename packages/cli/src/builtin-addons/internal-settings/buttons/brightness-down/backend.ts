import { z } from "zod"
import type { AddonButtonTypeService } from "@/addon/api"

import { configSchema } from "./config"

type Config = z.infer<typeof configSchema>

export default {
  configSchema,
  onTap: ({ coreMethods }) => {
    coreMethods.adjustBrightness({ direction: "down" })
  },
  onDblTap: ({ coreMethods }) => {
    coreMethods.adjustBrightness({ direction: "down" })
  },
} satisfies AddonButtonTypeService<Config>
