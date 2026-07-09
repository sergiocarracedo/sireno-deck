import type { AddonButtonTypeService } from "@/addon/api"

import { configSchema } from "./config"

export const TIME_BUTTON_INTERVAL_MS = 1000

export default {
  configSchema,
  defaultRenderIntervalMs: TIME_BUTTON_INTERVAL_MS,
} satisfies AddonButtonTypeService
