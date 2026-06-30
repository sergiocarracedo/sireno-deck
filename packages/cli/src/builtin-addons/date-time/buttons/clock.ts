import { z } from "zod";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const CLOCK_BUTTON_INTERVAL_MS = 1000;

export const clockButtonConfigSchema = z
  .object({
    showSeconds: z.boolean().optional().default(false),
    time_zone: z.string().min(1).optional(),
  })
  .strict();

export type ClockButtonConfig = z.infer<typeof clockButtonConfigSchema>;

export const clockButtonBackend: AddonButtonTypeBackend = {
  configSchema: clockButtonConfigSchema,
  defaultRenderIntervalMs: CLOCK_BUTTON_INTERVAL_MS,
};
