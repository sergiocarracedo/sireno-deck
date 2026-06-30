import { z } from "zod";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const mediaMuteButtonConfigSchema = z.object({}).strict();

export type MediaMuteButtonConfig = z.infer<typeof mediaMuteButtonConfigSchema>;

export const mediaMuteButtonBackend: AddonButtonTypeBackend = {
  configSchema: mediaMuteButtonConfigSchema,
  defaultRenderIntervalMs: 2000,
  onTap: ({ methods }) => {
    void methods["media-toggle-mute"]?.();
  },
};
