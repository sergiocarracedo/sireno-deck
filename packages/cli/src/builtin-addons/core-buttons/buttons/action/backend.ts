import { z } from "zod"
import type { Methods } from "@/deck/methods"
import type { AddonButtonTypeService } from "@/addon/api"

import { configSchema } from "./config"

type Config = z.infer<typeof configSchema>

export default {
  configSchema,
  onTap: async ({ config, methods }: { config: Config; methods: Methods }) => {
    await methods.runCommand(config.command, {
      ...(config.cwd !== undefined ? { cwd: config.cwd } : {}),
      ...(config.env !== undefined ? { env: config.env } : {}),
    })
  },
} satisfies AddonButtonTypeService
