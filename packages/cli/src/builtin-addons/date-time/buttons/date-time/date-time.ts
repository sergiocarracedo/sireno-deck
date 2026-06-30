import { z } from "zod";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const DIGITAL_DATE_TIME_INTERVAL_MS = 1000;

export const dateTimeButtonConfigSchema = z
  .object({
    format: z.string().min(1).optional().default("DD/MM/YYYY HH:mm:ss"),
  })
  .strict();

export type DateTimeButtonConfig = z.infer<typeof dateTimeButtonConfigSchema>;

export const dateTimeButtonBackend: AddonButtonTypeBackend = {
  configSchema: dateTimeButtonConfigSchema,
  defaultRenderIntervalMs: DIGITAL_DATE_TIME_INTERVAL_MS,
};
