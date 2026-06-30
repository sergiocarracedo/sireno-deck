import { z } from "zod";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const ANALOG_CLOCK_INTERVAL_MS = 1000;

export const analogClockButtonConfigSchema = z.object({}).strict();

export type AnalogClockButtonConfig = z.infer<typeof analogClockButtonConfigSchema>;

export const analogClockButtonBackend: AddonButtonTypeBackend = {
  configSchema: analogClockButtonConfigSchema,
  defaultRenderIntervalMs: ANALOG_CLOCK_INTERVAL_MS,
};
