import type { AddonButtonTypeService } from "@/addon/api"

import { configSchema } from "./config"

export default {
  configSchema,
  defaultRenderIntervalMs: 1000,
} satisfies AddonButtonTypeService
