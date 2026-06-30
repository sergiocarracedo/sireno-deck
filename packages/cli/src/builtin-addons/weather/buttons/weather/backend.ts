import type { AddonButtonTypeBackend } from "@/addon/api";

import { configSchema } from "./config";

export const WEATHER_DEFAULT_POLL_MS = 600_000;

export default {
  configSchema,
  defaultRenderIntervalMs: WEATHER_DEFAULT_POLL_MS,
} satisfies AddonButtonTypeBackend;