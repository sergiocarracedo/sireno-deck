import { z } from "zod";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const brightnessConfigSchema = z.object({});

export type BrightnessConfig = z.infer<typeof brightnessConfigSchema>;

export const brightnessButtonBackend: AddonButtonTypeBackend = {
  configSchema: brightnessConfigSchema,
  internal: true,
  onTap: async () => {},
};
