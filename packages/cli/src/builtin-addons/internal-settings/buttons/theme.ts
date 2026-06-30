import { z } from "zod";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const themeConfigSchema = z.object({});

export type ThemeConfig = z.infer<typeof themeConfigSchema>;

export const themeButtonBackend: AddonButtonTypeBackend = {
  configSchema: themeConfigSchema,
  internal: true,
  onTap: async () => {},
};
