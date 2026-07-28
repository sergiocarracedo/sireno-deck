import type {
  AddonButtonServiceContext,
  AddonButtonTypeService,
} from "@/addon/api"

import { configSchema, type ConfigSchema } from "./config"

export default {
  configSchema,
  onMount: (ctx: AddonButtonServiceContext<ConfigSchema>) => {
    ctx.methods["value-display:registerValues"]?.(ctx.buttonId, ctx.config)
  },
  dispose: (ctx: AddonButtonServiceContext<ConfigSchema>) => {
    ctx.methods["value-display:unregisterValues"]?.(ctx.buttonId)
  },
  defaultRenderIntervalMs: 5000,
} satisfies AddonButtonTypeService<ConfigSchema>
