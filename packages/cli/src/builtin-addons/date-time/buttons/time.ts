import { z } from "zod";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const TIME_BUTTON_INTERVAL_MS = 1000;

export const timeButtonConfigSchema = z
  .object({
    variant: z.enum(["default", "big"]).optional().default("default"),
  })
  .strict();

export type TimeButtonConfig = z.infer<typeof timeButtonConfigSchema>;

export const timeButtonBackend: AddonButtonTypeBackend = {
  configSchema: timeButtonConfigSchema,
  defaultRenderIntervalMs: TIME_BUTTON_INTERVAL_MS,
};
