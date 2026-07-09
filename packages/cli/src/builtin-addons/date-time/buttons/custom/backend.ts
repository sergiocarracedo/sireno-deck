import type { AddonButtonTypeService } from "@/addon/api"

import { configSchema } from "./config"

export const DIGITAL_DATE_TIME_INTERVAL_MS = 1000

export default {
  configSchema,
  defaultRenderIntervalMs: DIGITAL_DATE_TIME_INTERVAL_MS,
} satisfies AddonButtonTypeService
