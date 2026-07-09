import type { AddonButtonTypeService } from "@/addon/api"

import { configSchema } from "./config"

export const LOCKED_INTERVAL_MS = 1000

export default {
  configSchema,
  defaultRenderIntervalMs: LOCKED_INTERVAL_MS,
} satisfies AddonButtonTypeService
