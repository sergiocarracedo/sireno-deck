import { z } from "zod";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const sessionInfoConfigSchema = z.object({});

export type SessionInfoConfig = z.infer<typeof sessionInfoConfigSchema>;

export const sessionInfoButtonBackend: AddonButtonTypeBackend = {
  configSchema: sessionInfoConfigSchema,
  onTap: async () => {},
};
