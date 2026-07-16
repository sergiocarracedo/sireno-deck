import { z } from "zod"
import type { AddonButtonTypeService } from "@/addon/api"

import { configSchema } from "./config"

type Config = z.infer<typeof configSchema>

export default {
  configSchema,
  onTap: ({ coreMethods }) => {
    coreMethods.adjustBrightness({ direction: "up" })
  },
  onDblTap: ({ coreMethods }) => {
    coreMethods.adjustBrightness({ direction: "up" })
  },
} satisfies AddonButtonTypeService<Config>
