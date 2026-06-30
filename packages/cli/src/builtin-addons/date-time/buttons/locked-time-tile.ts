import { z } from "zod";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const LOCKED_INTERVAL_MS = 1000;

export const lockedTimeTileButtonConfigSchema = z
  .object({
    slot: z.enum([
      "hour",
      "hour-tens",
      "hour-ones",
      "separator",
      "minute",
      "minute-tens",
      "minute-ones",
    ]),
  })
  .strict();

export type LockedTimeTileButtonConfig = z.infer<typeof lockedTimeTileButtonConfigSchema>;

export const lockedTimeTileButtonBackend: AddonButtonTypeBackend = {
  configSchema: lockedTimeTileButtonConfigSchema,
  defaultRenderIntervalMs: LOCKED_INTERVAL_MS,
};
