import type { AddonButtonTypeBackend } from "@/addon/api";

import { configSchema } from "./config";

export const CLOCK_BUTTON_INTERVAL_MS = 1000;

export default {
  configSchema,
  defaultRenderIntervalMs: CLOCK_BUTTON_INTERVAL_MS,
} satisfies AddonButtonTypeBackend;