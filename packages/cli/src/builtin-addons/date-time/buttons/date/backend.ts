import type { AddonButtonTypeBackend } from "@/addon/api";

import configSchema from "./config";

export const DATE_BUTTON_INTERVAL_MS = 60000;

export default {
  configSchema,
  defaultRenderIntervalMs: DATE_BUTTON_INTERVAL_MS,
} satisfies AddonButtonTypeBackend;