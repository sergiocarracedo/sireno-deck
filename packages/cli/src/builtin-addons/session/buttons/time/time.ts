import { z } from "zod";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const sessionTimeConfigSchema = z.object({
  format: z.string().default("HH:mm"),
});

export type SessionTimeConfig = z.infer<typeof sessionTimeConfigSchema>;

export const sessionTimeButtonBackend: AddonButtonTypeBackend = {
  configSchema: sessionTimeConfigSchema,
  internal: true,
};
