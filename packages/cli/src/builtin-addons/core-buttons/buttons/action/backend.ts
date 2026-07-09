import { z } from "zod"
import type { AddonButtonTypeService, AddonButtonServiceContext } from "@/addon/api"

import { configSchema } from "./config"

type Config = z.infer<typeof configSchema>

export default {
  configSchema,
  onTap: async (
    ctx: AddonButtonServiceContext<unknown>,
  ) => {
    const { command } = ctx.config as Config
    await (ctx.methods["dispatch"] as (...args: unknown[]) => Promise<void>)(command)
  },
} satisfies AddonButtonTypeService
