import { z } from "zod";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const DATE_BUTTON_INTERVAL_MS = 60000;

export const dateButtonConfigSchema = z
  .object({
    locale: z.string().min(2).max(35).optional(),
    time_zone: z.string().min(1).optional(),
  })
  .strict();

export type DateButtonConfig = z.infer<typeof dateButtonConfigSchema>;

export const dateButtonBackend: AddonButtonTypeBackend = {
  configSchema: dateButtonConfigSchema,
  defaultRenderIntervalMs: DATE_BUTTON_INTERVAL_MS,
};
