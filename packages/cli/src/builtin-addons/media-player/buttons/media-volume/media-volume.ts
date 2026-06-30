import { z } from "zod";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const mediaVolumeButtonConfigSchema = z
  .object({
    direction: z.enum(["up", "down"]).optional().default("up"),
    step: z.number().int().min(1).max(50).optional().default(5),
  })
  .strict();

export type MediaVolumeButtonConfig = z.infer<typeof mediaVolumeButtonConfigSchema>;

export const mediaVolumeButtonBackend: AddonButtonTypeBackend = {
  configSchema: mediaVolumeButtonConfigSchema,
  defaultRenderIntervalMs: 2000,
  onTap: ({ methods, config }) => {
    const cfg = config as MediaVolumeButtonConfig;
    const method = cfg.direction === "down" ? "media-volume-down" : "media-volume-up";
    void methods[method]?.(cfg.step);
  },
};
