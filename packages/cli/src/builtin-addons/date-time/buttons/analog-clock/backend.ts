import type { AddonButtonTypeService } from "@/addon/api"

import { configSchema } from "./config"

export const ANALOG_CLOCK_INTERVAL_MS = 1000

export default {
  configSchema,
  defaultRenderIntervalMs: ANALOG_CLOCK_INTERVAL_MS,
} satisfies AddonButtonTypeService
