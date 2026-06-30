import { z } from "zod";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const mediaSampleConfigSchema = z.object({
  channel: z.string().min(1),
  fallback: z.unknown().optional(),
});

export type MediaSampleConfig = z.infer<typeof mediaSampleConfigSchema>;

export const mediaSampleButtonBackend: AddonButtonTypeBackend = {
  configSchema: mediaSampleConfigSchema,
  onTap: async () => {},
};
